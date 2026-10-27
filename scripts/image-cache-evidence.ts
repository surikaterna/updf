import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { imageCacheCostInput } from "./image-cache-cost-input.js";

const root = "/home/sprawl/projects/updf/trees/image-preparation";
assert.equal(process.cwd(), root);
const out = process.env.IMAGE_CACHE_OUT ?? "artifacts/image-cache-after";
await mkdir(out, { recursive: true });
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const before = await read("artifacts/image-cache-before/source.json");
const after = await read(`${out}/source.json`);
const changes = Object.keys(after.manifest).filter((path) => after.manifest[path] !== before.manifest[path]);
for (const path of changes)
  assert.ok(
    path === "scripts/boundaries.ts" ||
      /^(?:packages\/images\/|scripts\/image-cache-|tests\/(?:browser\/image-cache|consumer\/image-cache|consumer\/types\/images-cache)|docs\/evidence\/image-cache)/u.test(
        path,
      ),
    path,
  );
for (const path of Object.keys(before.manifest)) assert.ok(Object.hasOwn(after.manifest, path), path);
for (const name of ["core", "layout", "assets", "png", "jpeg"]) {
  const entries = Object.entries(before.sizes).filter(([path]) => path.startsWith(`packages/${name}/`));
  for (const [path, entry] of entries) assert.deepEqual(after.sizes[path], entry, path);
}
assert.equal(after.manifest["package-lock.json"], before.manifest["package-lock.json"]);
const contents = imageCacheCostInput();
const absolute = [];
for (const minify of [false, true]) {
  const result = await build({
    stdin: { contents, resolveDir: root, loader: "ts" },
    bundle: true,
    target: "es2022",
    format: "esm",
    platform: "browser",
    minify,
    write: false,
    metafile: true,
  });
  const bytes = result.outputFiles[0]!.contents;
  await writeFile(`${out}/cached-${minify ? "min" : "raw"}.mjs`, bytes);
  absolute.push({
    minify,
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    inputs: result.metafile.inputs,
  });
}
const node = await build({
  stdin: { contents, resolveDir: root, loader: "ts" },
  bundle: true,
  target: "es2022",
  format: "esm",
  platform: "node",
  write: false,
});
const url = `data:text/javascript;base64,${Buffer.from(node.outputFiles[0]!.contents).toString("base64")}`;
const proof = await (await import(url)).proof();
assert.deepEqual(proof.bytes, proof.control);
assert.deepEqual(proof.bytes, proof.again);
assert.equal(proof.fetches, 1);
const baseline = await read("artifacts/image-cache-before/costs.json");
const current = await read(`${out}/costs.json`);
const costs = Object.fromEntries(
  Object.keys(baseline).map((name) => [name, { before: baseline[name], after: current[name] }]),
);
const modules = Object.fromEntries(
  ["@updf/images", "@updf/images/load", "@updf/images/cache"].map((entry) => [
    entry,
    JSON.parse(
      execFileSync(
        process.execPath,
        ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
        { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } },
      ),
    ),
  ]),
);
const cjsCosts = {} as Record<string, { count: number; bytes: number }>;
for (const [entry, paths] of Object.entries(modules) as [string, string[]][]) {
  const bytes = await Promise.all(paths.map(async (path) => (await readFile(path)).length));
  cjsCosts[entry] = { count: paths.length, bytes: bytes.reduce((sum, size) => sum + size, 0) };
}
const totals = [before, after].map((state) => {
  const files = Object.entries(state.sizes).filter(([path]) => path.startsWith("packages/images/dist/")) as [
    string,
    { bytes: number },
  ][];
  const total = (pattern: RegExp) =>
    files.filter(([path]) => pattern.test(path)).reduce((sum, [, entry]) => sum + entry.bytes, 0);
  return { js: total(/\.(?:js|mjs)$/u), declarations: total(/\.d\.(?:ts|cts|mts)$/u), full: total(/./u) };
});
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", `${root}/${out}`], {
    cwd: `${root}/packages/images`,
    encoding: "utf8",
  }),
);
await writeFile(
  `${out}/summary.json`,
  JSON.stringify(
    {
      beforeHash: before.fullHash,
      afterHash: after.fullHash,
      sourceCounts: [Object.keys(before.manifest).length, Object.keys(after.manifest).length],
      changes,
      lockUnchanged: true,
      protectedPackagesSourceAndDistUnchanged: ["core", "layout", "assets", "png", "jpeg"],
      costs,
      absolute,
      inputSha256: createHash("sha256").update(contents).digest("hex"),
      proof: {
        fetches: proof.fetches,
        policies: proof.policies,
        pdfBytes: proof.bytes.length,
        exactColdWarmControl: true,
      },
      modules,
      cjsCosts,
      totals,
      packed,
    },
    null,
    2,
  ),
);
console.log({
  changes,
  absolute: absolute.map(({ minify, bytes, gzip }) => ({ minify, bytes, gzip })),
  packed: packed[0].size,
  sourceCounts: [Object.keys(before.manifest).length, Object.keys(after.manifest).length],
  cjsCosts,
  totals,
  costs: Object.fromEntries(
    Object.keys(baseline).map((name) => [
      name,
      {
        raw: [baseline[name][0].bytes, current[name][0].bytes],
        min: [baseline[name][1].bytes, current[name][1].bytes],
        gzip: [baseline[name][1].gzip, current[name][1].gzip],
      },
    ]),
  ),
  imagesDist: [before, after].map((state) =>
    Object.entries(state.sizes)
      .filter(([path]) => path.startsWith("packages/images/dist/"))
      .reduce((sum, [, entry]) => sum + (entry as { bytes: number }).bytes, 0),
  ),
});
