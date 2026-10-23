import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = "artifacts/text-flow";
const target = `${root}/sibling-final-vs-before/final`;
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const before = await read(`${root}/sibling-final-before/report.json`);
const after = await read(`${target}/report.json`);
const library = await read(`${root}/sibling-final-vs-library/final/report.json`);
assert.deepEqual(after.metrics, library.metrics);
for (const field of ["versions", "flags"]) assert.deepEqual(after[field], before[field]);
for (const [name, input] of Object.entries(before.inputs)) assert.equal(after.inputs[name], input);
const costs = Object.fromEntries(
  Object.entries(after.comparison).filter(
    ([key]) =>
      /^consumer\/.*-min\//u.test(key) || /^(?:emitted|pack)\/@updf\/(?:core|layout|text|text-flow)\//u.test(key),
  ),
);
for (const [key, row] of Object.entries(after.comparison) as [string, { delta: number | null }][]) {
  if (/^consumer\/(?:ordinaryText|preparedFont|drawing|jpeg)-/u.test(key)) assert.equal(row.delta, 0, key);
  if (/^(?:emitted|pack)\/@updf\/(?!text\/|layout\/|text-flow\/)/u.test(key)) assert.equal(row.delta, 0, key);
}
const proof = await import(pathToFileURL(resolve(`${target}/textFlowSiblings-node-min.mjs`)).href);
const extracted = execFileSync("pdftotext", ["-raw", "-", "-"], { input: proof.pdf, encoding: "utf8" })
  .replace(/\s+/gu, " ")
  .trim();
assert.equal(
  extracted,
  `Rich styled span first paragraph. ${"Second paragraph has full width text below the float. ".repeat(20)}`.trim(),
);
assert.ok(proof.result.pageCount > 1);
const result = {
  costs,
  execution: {
    pages: proof.result.pageCount,
    pdfBytes: proof.pdf.length,
    pdfSha256: createHash("sha256").update(proof.pdf).digest("hex"),
    text: extracted,
  },
};
await writeFile(
  `${target}/summary.json`,
  `${JSON.stringify({ ...result, libraryComparison: library.comparison }, null, 2)}\n`,
  { flag: "wx" },
);
console.log(result);
