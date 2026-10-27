import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { bridgeCostInput } from "./png-shape-bridge-cost-input.js";
import { fixture } from "../packages/png/test/helpers.js";

const out = process.argv[2];
if (!out) throw new Error("Supply a new receipt path");
const costs = [];
for (const minify of [false, true]) {
  const result = await build({
    stdin: { contents: bridgeCostInput(), resolveDir: process.cwd() },
    platform: "browser",
    format: "esm",
    target: "es2022",
    bundle: true,
    write: false,
    minify,
    metafile: true,
  });
  const bytes = result.outputFiles[0]!.contents;
  costs.push({
    minify,
    bytes: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    inputs: Object.keys(result.metafile!.inputs),
  });
}
const runtime = await build({
  stdin: { contents: bridgeCostInput(), resolveDir: process.cwd() },
  platform: "node",
  format: "esm",
  bundle: true,
  write: false,
});
await writeFile(`${out}.runtime.mjs`, runtime.outputFiles[0]!.contents, { flag: "wx" });
const active = await import(pathToFileURL(`${process.cwd()}/${out}.runtime.mjs`).href);
let fetches = 0;
// Use an exact ArrayBuffer view; pooled Buffer storage is not an encoded PNG payload.
const bytes = Uint8Array.from(fixture());
const exactLoader = active.createAssetLoader({
  baseURI: "https://bridge.invalid/",
  allowUri: () => true,
  fetch: async () => {
    fetches++;
    let read = false;
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: {
        getReader: () => ({
          async read() {
            if (read) return { done: true };
            read = true;
            return { value: bytes };
          },
          async cancel() {},
          releaseLock() {},
        }),
      },
    };
  },
});
const proof = await active.inspect(exactLoader, "visual.png", "mask.png");
assert.deepEqual(proof.resources, ["Prepared0", "Prepared1"]);
assert.equal(fetches, 2);
assert.deepEqual(proof.reports, [{ x: 5.625, y: 0, width: 20, height: 20 }]);
assert.ok(proof.pdf.length > 0);
const before = JSON.parse(await readFile("artifacts/alpha-integration-before/costs.json", "utf8"));
const foundation = JSON.parse(await readFile("artifacts/alpha-integration-s7b1/costs.json", "utf8"));
const after = JSON.parse(await readFile(process.argv[3]!, "utf8"));
const pairs = after.costs.map((row: { name: string; minify: boolean; bytes: number; gzip: number }, index: number) => {
  const a = before.costs[index],
    b = foundation.costs[index];
  assert.equal(a.name, row.name);
  assert.equal(b.name, row.name);
  assert.equal(a.minify, row.minify);
  assert.equal(b.minify, row.minify);
  return {
    name: row.name,
    minify: row.minify,
    bytes: row.bytes,
    gzip: row.gzip,
    fromS7a: { bytes: row.bytes - a.bytes, gzip: row.gzip - a.gzip },
    fromFoundation: { bytes: row.bytes - b.bytes, gzip: row.gzip - b.gzip },
  };
});
await writeFile(
  out,
  JSON.stringify(
    {
      costs,
      proof: { fetches, reports: proof.reports, resources: proof.resources, pdfBytes: proof.pdf.length },
      pairs,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log({
  costs: costs.map(({ inputs: _inputs, ...row }) => row),
  proof: { fetches, reports: proof.reports },
  pairs,
});
