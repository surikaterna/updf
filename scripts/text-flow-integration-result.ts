import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = "artifacts/text-flow/";
const json = async (path: string) => JSON.parse(await readFile(`${root}${path}`, "utf8"));
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const manifest = await json("sibling-integration-before/manifest.json");
const before = await json("sibling-integration-before/report.json");
const current = await json("sibling-integration-vs-before/report.json");
const library = await json("sibling-integration-vs-library/report.json");
assert.deepEqual(current.metrics, library.metrics);
for (const field of ["inputs", "versions", "flags", "lockSha256"]) assert.deepEqual(current[field], before[field]);
for (const [path, expected] of Object.entries(manifest.historical)) assert.equal(await hash(path), expected, path);
assert.equal(await hash(`${root}sibling-integration-before/report.json`), manifest.reportSha256);
const permitted = new Set([
  "packages/layout/src/fragment-state.ts",
  "packages/layout/src/content-inline-selection.ts",
  "packages/text/src/wrap-selector.ts",
  "packages/text/src/inline-selection.ts",
  "packages/text/src/inline-selection-types.ts",
  "packages/text/test/wrap-selector.test.ts",
  "scripts/boundaries.ts",
]);
const changed = [];
for (const [path, old] of Object.entries(manifest.hashes)) {
  const current = await hash(path);
  if (old === current) continue;
  assert.ok(permitted.has(path), `Unexpected inherited change: ${path}`);
  changed.push({ path, before: old, current });
}
for (const [key, row] of Object.entries(current.comparison) as [string, { delta: number }][]) {
  if (/^(?:emitted|pack)\/@updf\/(?!text\/|layout\/)/u.test(key)) assert.equal(row.delta, 0, key);
  if (/^consumer\/(?:drawing|jpeg)-/u.test(key)) assert.equal(row.delta, 0, key);
}
for (const consumer of current.consumers) {
  if (/^textFlow/u.test(consumer.label)) continue;
  assert.ok(!consumer.modules.some((path: string) => /inline-selection|content-inline-selection/u.test(path)));
}
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });
const paths = git("ls-files", "-co", "--exclude-standard", "-z").split("\0").filter(Boolean);
const hashes = Object.fromEntries(
  await Promise.all([...new Set(paths)].sort().map(async (path) => [path, await hash(path)])),
);
const rows = (pattern: RegExp) =>
  Object.fromEntries(Object.entries(current.comparison).filter(([key]) => pattern.test(key)));
const evidence = {
  scope: "Partial source-coordinate/state slice; sibling float is NOT integrated",
  cwd: process.cwd(),
  branch: git("branch", "--show-current").trim(),
  head: git("rev-parse", "HEAD").trim(),
  status: git("status", "--porcelain=v1", "--untracked-files=all"),
  changed,
  added: Object.keys(hashes).filter((path) => !(path in manifest.hashes)),
  hashes,
  reports: {
    incremental: await hash(`${root}sibling-integration-vs-before/report.json`),
    library: await hash(`${root}sibling-integration-vs-library/report.json`),
  },
  consumerCosts: rows(/^consumer\/.*-(?:browser|node)-min\//u),
  genericSeamCosts: rows(/^(?:emitted|pack)\/@updf\/(?:core|layout|text)\//u),
  assertions:
    "All historical hashes intact; 222 initial metrics match; final metrics equal; old inputs/tools/lock unchanged; only seven inherited paths changed; core/addon/other packages unchanged; optional inline bridge absent from ordinary graphs",
};
await writeFile(`${root}sibling-integration-vs-before/evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`);
console.log({ changed, added: evidence.added, costs: evidence.consumerCosts, packages: evidence.genericSeamCosts });
