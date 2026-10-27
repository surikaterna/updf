import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, readdir, stat, symlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { preparedImageCostInputs } from "./prepared-image-cost-inputs.js";
import { visualPreparationCostInput } from "./visual-preparation-cost-input.js";
import { urlImageInput } from "./url-image-cost-inputs.js";

const root = process.cwd();
const beforeOut = process.env.URL_IMAGES_BEFORE ?? "artifacts/url-images-runtime-before";
const out = process.env.URL_IMAGES_OUT ?? "artifacts/url-images-runtime-after";
await mkdir(`${out}/baseline`, { recursive: true });
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const baseline = await read(`${beforeOut}/shared/report.json`);
const current = await read(`${out}/shared/report.json`);
assert.deepEqual(current.flags, baseline.flags);
assert.deepEqual(current.versions, baseline.versions);
assert.deepEqual(current.inputs, baseline.inputs);
assert.equal(Object.keys(current.comparison).length, 312);
const old = await mkdtemp("/tmp/opencode/updf-url-images-before-");
await mkdir(join(old, "node_modules", "@updf"), { recursive: true });
for (const library of baseline.libraries) {
  const name = library.name.slice("@updf/".length);
  const directory = join(old, "packages", name);
  await mkdir(directory, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    resolve(beforeOut, "shared", library.pack.filename),
    "--strip-components=1",
    "-C",
    directory,
  ]);
  await symlink(`../../packages/${name}`, join(old, "node_modules", library.name));
}

async function bundle(
  profile: string,
  contents: string,
  platform: "browser" | "node",
  minify: boolean,
  prior: boolean,
) {
  const built = await build({
    absWorkingDir: prior ? old : root,
    stdin: { contents, resolveDir: prior ? old : root, loader: "ts" },
    bundle: true,
    target: "es2022",
    format: "esm",
    platform,
    minify,
    write: false,
    metafile: true,
  });
  const label = `${profile}-${platform}-${minify ? "min" : "raw"}`;
  const output = built.outputFiles[0]!;
  const destination = prior ? `${out}/baseline` : out;
  await writeFile(`${destination}/${label}.mjs`, output.contents);
  await writeFile(`${destination}/${label}.meta.json`, JSON.stringify(built.metafile, null, 2));
  const modules = Object.keys(built.metafile.inputs);
  const codec = /URL-(png|jpeg)/u.exec(profile)?.[1];
  if (codec) assert.ok(!modules.some((path) => path.includes(`/${codec === "png" ? "jpeg" : "png"}/`)));
  return {
    label,
    bytes: output.contents.length,
    gzip: gzipSync(output.contents, { level: 9 }).length,
    sourceSha256: hash(contents),
    parsed: modules.length,
    modules,
    retained: Object.values(built.metafile.outputs).reduce(
      (sum, value) => sum + Object.values(value.inputs).filter((input) => input.bytesInOutput > 0).length,
      0,
    ),
    imageBytes: Object.values(built.metafile.outputs).reduce(
      (sum, output) =>
        sum +
        Object.entries(output.inputs)
          .filter(([path]) => /(?:^|\/)packages\/images\//u.test(path))
          .reduce((bytes, [, input]) => bytes + input.bytesInOutput, 0),
      0,
    ),
  };
}

async function loads(directory: string, entries: readonly string[]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "-e",
        `
    const Module=require('node:module'),seen=new Set(),load=Module._load;
    Module._load=function(id,parent,...rest){seen.add(Module._resolveFilename(id,parent));return load.call(this,id,parent,...rest)};
    for(const entry of ${JSON.stringify(entries)})require(entry);
    process.stdout.write(JSON.stringify([...seen]));
  `,
      ],
      { cwd: directory, encoding: "utf8" },
    ),
  );
  const files = modules.filter((path) => path.startsWith(directory));
  return {
    modules: files.map((path) => path.slice(directory.length + 1)),
    bytes: (await Promise.all(files.map(async (path) => (await readFile(path)).length))).reduce((a, b) => a + b, 0),
  };
}

const paired = [];
for (const [profile, contents] of Object.entries({
  ...preparedImageCostInputs(),
  fakeNative: visualPreparationCostInput(),
}))
  for (const platform of ["browser", "node"] as const)
    for (const minify of [false, true])
      paired.push({
        before: await bundle(profile, contents, platform, minify, true),
        after: await bundle(profile, contents, platform, minify, false),
        meaning: "matched full input; before reconstructed from frozen fresh-before tarballs, not HEAD",
      });
const absolute = [];
for (const [profile, contents] of Object.entries({
  "URL-png": urlImageInput("png"),
  "URL-jpeg": urlImageInput("jpeg"),
  "URL-mixed": urlImageInput(),
  preparedAsync: preparedImageCostInputs()
    .ordinaryPNG!.replace("@updf/layout/render", "@updf/layout/async")
    .replace("{render}", "{renderAsync}")
    .replace("return render(", "return renderAsync("),
}))
  for (const platform of ["browser", "node"] as const)
    for (const minify of [false, true]) absolute.push(await bundle(profile, contents, platform, minify, false));
const unshaken = [];
for (const [profile, entries] of Object.entries({
  drawing: ["@updf/core"],
  layout: ["@updf/layout"],
  textFlow: ["@updf/text-flow"],
  images: ["@updf/images"],
  async: ["@updf/layout/async"],
  load: ["@updf/images/load"],
  png: ["@updf/images/load", "@updf/images/png"],
  jpeg: ["@updf/images/load", "@updf/images/jpeg"],
})) {
  const after = await loads(root, entries);
  if (["drawing", "layout", "textFlow", "images"].includes(profile))
    assert.ok(!after.modules.some((path) => /\/(assets|png|jpeg)\/|load-session|internal-preparation/u.test(path)));
  if (["load", "async"].includes(profile)) assert.ok(!after.modules.some((path) => /\/(png|jpeg)\//u.test(path)));
  unshaken.push({
    profile,
    before: ["async", "load", "png", "jpeg"].includes(profile) ? null : await loads(old, entries),
    after,
  });
}

async function treeBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    bytes += entry.isDirectory() ? await treeBytes(path) : (await stat(path)).size;
  }
  return bytes;
}
const consumers = await read(process.env.URL_IMAGES_CONSUMERS ?? `${out}/consumers.json`);
for (const report of consumers.reports) report.installedBytes = await treeBytes(join(report.directory, "node_modules"));
await writeFile(
  `${out}/summary.json`,
  JSON.stringify(
    {
      baseline: beforeOut,
      oldTarballRoot: old,
      paired,
      absolute,
      unshaken,
      installed: consumers.reports,
      lock: {
        before: baseline.lockSha256,
        after: current.lockSha256,
        meaning: "optional image leaf peers only; no added mandatory codec dependency",
      },
      versions: current.versions,
      flags: current.flags,
      sharedComparison: current.comparison,
      libraryInventories: current.libraries.map((library: { name: string; pack: unknown; totals: unknown }) => ({
        name: library.name,
        pack: library.pack,
        totals: library.totals,
      })),
      packageMeaning:
        "full per-package JS/declarations/maps and packed/unpacked payload in shared/report.json; installedBytes are separate actual selected closures",
      fakeFixture: {
        sha256: hash(visualPreparationCostInput()),
        meaning: "native corrected fixture; do not compare with historical rectangle-only fixture",
      },
    },
    null,
    2,
  ),
);
console.log({
  paired: paired.length,
  absolute: absolute.length,
  unshaken: unshaken.map(({ profile, before, after }) => ({ profile, before: before?.bytes, after: after.bytes })),
  installed: consumers.reports.map((r: { codec: string; installedBytes: number }) => ({
    codec: r.codec,
    bytes: r.installedBytes,
  })),
});

const compact = (row: {
  label: string;
  bytes: number;
  gzip: number;
  parsed: number;
  retained: number;
  imageBytes: number;
}) => ({
  label: row.label,
  bytes: row.bytes,
  gzip: row.gzip,
  parsed: row.parsed,
  retained: row.retained,
  imageBytes: row.imageBytes,
});
const costs = {
  paired: paired.map(({ before, after }) => ({ before: compact(before), after: compact(after) })),
  absolute: absolute.map(compact),
  generic: Object.fromEntries(
    Object.entries(current.comparison).filter(([key]) =>
      /^(?:consumer\/(?:layout|authoredRender|drawing|ordinaryText)-|total\/|emitted\/@updf\/images\/|pack\/@updf\/images\/)/u.test(
        key,
      ),
    ),
  ),
};
await writeFile(`${out}/costs.json`, JSON.stringify(costs, null, 2));
console.log(costs);
