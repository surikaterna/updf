import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = "artifacts/text-flow";
const target = `${root}/sibling-validation-fixed-vs-before`;
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
async function inventory(directory: string, result: Record<string, string>): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(path, result);
    else result[path] = await hash(path);
  }
}
const paths = [...new Set(git("ls-files", "-co", "--exclude-standard", "-z").split("\0").filter(Boolean))].sort();
const hashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, await hash(path)])));
const state = {
  cwd: process.cwd(),
  branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(),
  status: git("status", "--porcelain=v1", "--untracked-files=all"),
  hashes,
};
async function freeze(): Promise<void> {
  const previous = await read(`${root}/sibling-final-before/result.json`);
  for (const [path, expected] of Object.entries(previous.hashes)) assert.equal(hashes[path], expected, path);
  const historical: Record<string, string> = {};
  await inventory(root, historical);
  await mkdir(target, { recursive: true });
  await writeFile(`${target}/start.json`, `${JSON.stringify({ ...state, historical }, null, 2)}\n`, { flag: "wx" });
  console.log({ sources: paths.length, historical: Object.keys(historical).length });
}
async function summary(): Promise<void> {
  const after = await read(`${target}/report.json`);
  const library = await read(`${root}/sibling-validation-fixed-vs-library/report.json`);
  const before = await read(`${root}/sibling-final-vs-before/final/report.json`);
  assert.deepEqual(after.metrics, library.metrics);
  for (const field of ["versions", "flags", "inputs"]) assert.deepEqual(after[field], before[field]);
  const original = await read(`${root}/sibling-final-before/report.json`);
  const integration = Object.fromEntries(
    Object.entries(after.metrics).map(([key, value]) => [
      key,
      {
        before: original.metrics[key] ?? null,
        after: value,
        delta: key in original.metrics ? (value as number) - original.metrics[key] : null,
      },
    ]),
  );
  for (const [key, row] of Object.entries(after.comparison) as [string, { delta: number | null }][]) {
    if (/^consumer\/(?:ordinaryText|preparedFont|drawing|jpeg)-/u.test(key)) assert.equal(row.delta, 0, key);
    if (/^(?:emitted|pack)\/@updf\/(?!layout\/)/u.test(key)) assert.equal(row.delta, 0, key);
  }
  const proof = await import(pathToFileURL(resolve(`${target}/textFlowSiblings-node-min.mjs`)).href);
  const pdfPath = `${target}/siblings.pdf`;
  await writeFile(pdfPath, proof.pdf, { flag: "wx" });
  const qpdf = execFileSync("qpdf", ["--check", pdfPath], { encoding: "utf8" });
  const text = execFileSync("pdftotext", ["-raw", pdfPath, "-"], { encoding: "utf8" }).replace(/\s+/gu, " ").trim();
  const previous = await read(`${root}/sibling-final-vs-before/final/pdf-proof.json`);
  assert.equal(text, previous.text);
  assert.equal(await hash(pdfPath), previous.sha256);
  assert.equal(proof.result.pageCount, previous.pages);
  const execution = { path: pdfPath, bytes: proof.pdf.length, sha256: await hash(pdfPath), text, qpdf };
  await writeFile(
    `${target}/summary.json`,
    `${JSON.stringify({ fixOnly: after.comparison, integration, library: library.comparison, execution }, null, 2)}\n`,
    { flag: "wx" },
  );
  console.log({ execution, fixOnly: after.comparison });
}
async function result(): Promise<void> {
  const start = await read(`${target}/start.json`);
  for (const [path, expected] of Object.entries(start.historical)) assert.equal(await hash(path), expected, path);
  for (const path of Object.keys(start.hashes)) assert.ok(path in hashes, `Removed inherited source: ${path}`);
  for (const field of ["cwd", "branch", "head"] as const) assert.equal(state[field], start[field]);
  assert.equal(git("diff", "--cached", "--name-only"), "");
  const permitted = new Set([
    "packages/layout/src/participation.ts",
    "scripts/text-flow-sibling-validation-evidence.ts",
    "docs/evidence/text-flow-sibling-integration.md",
  ]);
  const changed = paths.filter((path) => start.hashes[path] && hashes[path] !== start.hashes[path]);
  const added = paths.filter((path) => !start.hashes[path]);
  for (const path of changed) assert.ok(permitted.has(path), `Unexpected edit: ${path}`);
  assert.deepEqual(added, ["packages/text-flow/test/sibling-validation.test.ts"]);
  const artifacts: Record<string, string> = {};
  await inventory(root, artifacts);
  const sizes = Object.fromEntries(
    await Promise.all(
      [...changed, ...added].map(async (path) => [
        path,
        { sha256: hashes[path], bytes: (await readFile(path)).length },
      ]),
    ),
  );
  const deliveryArtifacts = Object.fromEntries(
    Object.entries(artifacts).filter(([path]) => !(path in start.historical)),
  );
  await writeFile(
    `${target}/evidence.json`,
    `${JSON.stringify(
      { ...state, changed, added, sizes, deliveryArtifacts, historicalPreserved: Object.keys(start.historical).length },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  console.log({ changed, added, sizes, fingerprint: await hash(`${target}/evidence.json`) });
}
if (process.argv.includes("--freeze")) await freeze();
else if (process.argv.includes("--summary")) await summary();
else await result();
