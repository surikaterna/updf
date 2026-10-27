import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { resourcePreparationCostInput } from "./resource-preparation-cost-input.js";

const out = process.argv[2] ?? "artifacts/private-preparation-after";
const baseline = process.argv[3] ?? "artifacts/private-preparation-before";
const previous = process.argv[3] ? JSON.parse(await readFile(`${baseline}/summary.json`, "utf8")) : undefined;
const before = JSON.parse(await readFile(`${baseline}/shared/report.json`, "utf8"));
const after = JSON.parse(await readFile(`${out}/shared/report.json`, "utf8"));
assert.deepEqual(after.inputs, before.inputs);
assert.deepEqual(after.versions, before.versions);
assert.equal(after.lockSha256, before.lockSha256);
assert.deepEqual(
  after.libraries.map(({ name }: { name: string }) => name),
  before.libraries.map(({ name }: { name: string }) => name),
);
for (const consumer of after.consumers) {
  assert.ok(
    !consumer.modules.some((path: string) =>
      /\/(?:internal-preparation|preparation-resource|preparation-signal|preparation-content)\.js$/u.test(path),
    ),
  );
}
await mkdir(out, { recursive: true });
const activated: Awaited<ReturnType<typeof activatedConsumer>>[] = [];
for (const platform of ["browser", "node"] as const) {
  for (const minify of [false, true]) activated.push(await activatedConsumer(platform, minify));
}
const result = {
  before: `${baseline}/shared/report.json`,
  after: `${out}/shared/report.json`,
  libraries: after.libraries.length,
  newRuntimePackages: [],
  matchedMetrics: Object.keys(after.comparison).length,
  ordinaryDeltas: Object.fromEntries(
    Object.entries(after.comparison).filter(([key]) =>
      /consumer\/(?:layout|authoredRender|ordinaryText|drawing)-/u.test(key),
    ),
  ),
  packageDeltas: Object.fromEntries(
    Object.entries(after.comparison).filter(([key]) => /^(?:total\/|pack\/@updf\/(?:core|layout)\/)/u.test(key)),
  ),
  activated,
  activatedDeltas: previous?.activated.map((base: { label: string; bytes: number; gzip: number }) => {
    const current = activated.find(({ label }) => label === base.label)!;
    return {
      label: base.label,
      bytes: { before: base.bytes, after: current.bytes, delta: current.bytes - base.bytes },
      gzip: { before: base.gzip, after: current.gzip, delta: current.gzip - base.gzip },
    };
  }),
  payloadMeaning:
    "All 16 library tarballs include emitted JS, declarations, maps and other shipped files. Package payload, not dependency closure. No source map, vendor or extractor file omitted from tarball inventories.",
};
await writeFile(`${out}/summary.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(result);

async function activatedConsumer(platform: "browser" | "node", minify: boolean) {
  const label = `preparation-${platform}-${minify ? "min" : "raw"}`;
  const result = await build({
    stdin: { contents: resourcePreparationCostInput(), resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    platform,
    format: "esm",
    target: "es2022",
    minify,
    metafile: true,
    write: false,
  });
  const output = result.outputFiles[0]!;
  const modules = Object.keys(result.metafile.inputs);
  assert.ok(modules.some((path) => path.endsWith("/internal-preparation.js")));
  assert.ok(!modules.some((path) => /\/(?:assets|png|jpeg|fontkit|fontkite|images|text-flow)\//u.test(path)));
  await writeFile(resolve(out, `${label}.mjs`), output.contents);
  await writeFile(resolve(out, `${label}.meta.json`), JSON.stringify(result.metafile, null, 2));
  return {
    label,
    bytes: output.contents.length,
    gzip: gzipSync(output.contents, { level: 9 }).length,
    parsedModules: modules.length,
    retainedModules: Object.values(result.metafile.outputs).reduce(
      (sum, value) => sum + Object.values(value.inputs).filter(({ bytesInOutput }) => bytesInOutput > 0).length,
      0,
    ),
    status: previous ? "paired against original S5b.1" : "new; absolute cost only",
    modules,
  };
}
