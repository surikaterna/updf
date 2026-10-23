import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const target = "artifacts/text-flow/sibling-final-vs-before/final";
const proof = await import(pathToFileURL(resolve(`${target}/textFlowSiblings-node-min.mjs`)).href);
const path = `${target}/siblings.pdf`;
await writeFile(path, proof.pdf, { flag: "wx" });
const qpdf = execFileSync("qpdf", ["--check", path], { encoding: "utf8" });
const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).replace(/\s+/gu, " ").trim();
assert.equal(
  text,
  `Rich styled span first paragraph. ${"Second paragraph has full width text below the float. ".repeat(20)}`.trim(),
);
const result = {
  path,
  pages: proof.result.pageCount,
  bytes: proof.pdf.length,
  sha256: createHash("sha256").update(proof.pdf).digest("hex"),
  qpdf,
  text,
};
await writeFile(`${target}/pdf-proof.json`, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(result);
