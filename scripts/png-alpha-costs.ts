import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { pngAlphaProofInput } from "./png-alpha-proof-input.js";
import { fixture } from "../packages/png/test/helpers.js";

const out = process.argv[2];
if (!out) throw new Error("Supply a fresh receipt path");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const baselinePath = "artifacts/alpha-integration-complete/costs.json";
const foundation = await read(baselinePath);
const source = await read("artifacts/alpha-integration-complete/final-source.json");
const sourceHash = "e63acffb56137c73c1e89ab60c70dc9bef7e43b537375ca3dafd477ad70ef904";
assert.equal(digest(JSON.stringify(source.manifest)), sourceHash);
assert.equal(source.fullHash, sourceHash);
// Pin the agreed historical receipt to its completed-source milestone, not a directory label.
const receiptHash = "8d71f54c60ef79944fbc07a356dbb6deb82e8d58e349e94d6da0b5a7ec28156a";
assert.equal(digest(await readFile(baselinePath)), receiptHash);
const currentPath = process.argv[3] ?? "artifacts/png-alpha-integration-fixed/costs.json";
const current = await read(currentPath);
const previous = await read("artifacts/png-alpha-integration-final/costs.json");
assert.equal(current.costs.length, foundation.costs.length);
assert.equal(current.costs.length, previous.costs.length);
assert.equal(
  digest(await readFile("artifacts/png-alpha-integration-final/costs.json")),
  "27687823075d16c5aaf70d9686f3c1d4839498bad74aaf20c13593d08ab4c6d0",
);
const currentSourcePath = process.argv[4] ?? "artifacts/png-alpha-integration-fixed/cost-source.json";
const currentSource = await read(currentSourcePath);
assert.equal(digest(JSON.stringify(currentSource.manifest)), currentSource.hash);
for (const path of [
  "scripts/png-shape-costs.ts",
  "scripts/text-flow-cost-inputs.ts",
  "scripts/prepared-image-cost-inputs.ts",
  "scripts/image-cache-cost-input.ts",
])
  assert.equal(
    createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    source.manifest[path],
    path,
  );
const pairs = current.costs.map((row: { name: string; minify: boolean; bytes: number; gzip: number }, i: number) => {
  const before = foundation.costs[i],
    old = previous.costs[i];
  assert.equal(before.name, row.name);
  assert.equal(before.minify, row.minify);
  assert.equal(old.name, row.name);
  assert.equal(old.minify, row.minify);
  return {
    name: row.name,
    minify: row.minify,
    before: { bytes: before.bytes, gzip: before.gzip },
    after: { bytes: row.bytes, gzip: row.gzip },
    delta: { bytes: row.bytes - before.bytes, gzip: row.gzip - before.gzip },
    fixOnly: { bytes: row.bytes - old.bytes, gzip: row.gzip - old.gzip },
  };
});
const selected = [];
for (const automatic of [false, true]) {
  const contents = pngAlphaProofInput(false, automatic);
  for (const minify of [false, true]) {
    const result = await build({
      stdin: { contents, resolveDir: process.cwd() },
      platform: "browser",
      format: "esm",
      target: "es2022",
      bundle: true,
      write: false,
      minify,
      metafile: true,
    });
    const bytes = result.outputFiles[0]!.contents;
    selected.push({
      automatic,
      minify,
      bytes: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      inputs: Object.keys(result.metafile!.inputs),
    });
  }
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    platform: "node",
    format: "esm",
    bundle: true,
    write: false,
  });
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0]!.contents).toString("base64")}`
  );
  const proof = await api.proof(fixture());
  assert.equal(proof.fetches, 1);
  assert.ok(
    proof.results.every(
      (row: { sameResource: boolean; rects: unknown[] }) => row.sameResource && row.rects.length === 2,
    ),
  );
  selected.push({
    automatic,
    runtime: {
      ...proof,
      results: proof.results.map(({ pdf, ...row }: { pdf: number[] }) => ({ ...row, pdfBytes: pdf.length })),
    },
  });
}
const loads = [];
for (const entry of [
  "@updf/text-flow",
  "@updf/text-flow/sources",
  "@updf/text-flow/path",
  "@updf/text-flow/png-shape",
  "@updf/text-flow/png-alpha",
]) {
  const modules: string[] = JSON.parse(
    execFileSync(
      process.execPath,
      ["-e", `require('${entry}');console.log(JSON.stringify(Object.keys(require.cache)))`],
      { encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } },
    ),
  );
  const sizes = await Promise.all(modules.map(async (path) => (await readFile(path)).length));
  loads.push({ entry, modules, bytes: sizes.reduce((a, b) => a + b, 0) });
}
await writeFile(
  out,
  JSON.stringify(
    {
      baseline: { path: baselinePath, sourceHash, receiptHash, historical: true },
      current: {
        path: currentPath,
        receiptHash: digest(await readFile(currentPath)),
        sourcePath: currentSourcePath,
        sourceHash: currentSource.hash,
      },
      fixOnlyBaseline: "artifacts/png-alpha-integration-final/costs.json",
      pairs,
      selected,
      loads,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log({
  pairs,
  selected: selected.map(({ inputs: _inputs, ...row }) => row),
  loads: loads.map(({ modules, ...row }) => ({ ...row, count: modules.length })),
});
