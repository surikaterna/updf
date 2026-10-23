import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = "artifacts/text-flow/";
const json = async (path: string) => JSON.parse(await readFile(root + path, "utf8"));
const hash = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
const manifest = await json("sibling-before/manifest.json");
const before = await json("sibling-before/report.json");
const current = await json("sibling-vs-before/report.json");
const library = await json("sibling-vs-library/report.json");
const historical = JSON.parse(await readFile(manifest.historicalReport, "utf8"));
assert.equal(await hash(manifest.historicalReport), manifest.historicalReportSha256);
assert.equal(await hash(root + "edge-profile-vs-before/evidence.json"), manifest.historicalEvidenceSha256);
assert.equal(Object.keys(before.metrics).length, 222);
assert.deepEqual(before.metrics, historical.metrics);
assert.deepEqual(current.metrics, library.metrics);
for (const field of ["versions", "flags", "lockSha256", "inputs"])
  assert.deepEqual(current[field], before[field], field);
const permitted = new Set([
  "packages/text/src/inline.ts",
  "packages/text/src/wrap-selector.ts",
  "packages/text/src/composition-operation.ts",
  "packages/text/src/composition.ts",
  "packages/layout/src/content-paragraph.ts",
  "scripts/boundaries.ts",
]);
const inheritedChanges = [];
for (const [path, old] of Object.entries(manifest.hashes)) {
  const current = await hash(path);
  if (old === current) continue;
  assert.ok(permitted.has(path), `Unexpected inherited change: ${path}`);
  inheritedChanges.push({ path, before: old, current });
}
for (const [key, row] of Object.entries(current.comparison) as [string, { delta: number }][]) {
  if (/^(?:emitted|pack)\/@updf\/(?!text\/|layout\/)/u.test(key)) assert.equal(row.delta, 0, key);
  if (/^consumer\/(?:drawing|jpeg)-/u.test(key)) assert.equal(row.delta, 0, key);
}
for (const consumer of current.consumers) {
  if (/^textFlow/u.test(consumer.label)) continue;
  assert.ok(
    !consumer.modules.some((path: string) => /inline-selection|content-inline-selection/u.test(path)),
    consumer.label,
  );
}
const paths = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const hashes = Object.fromEntries(
  await Promise.all([...new Set(paths)].sort().map(async (path) => [path, await hash(path)])),
);
const rows = (report: typeof current, pattern: RegExp) =>
  Object.fromEntries(Object.entries(report.comparison).filter(([key]) => pattern.test(key)));
const consumers = /^consumer\/.*-(?:browser|node)-min\//u;
const packages = /^(?:emitted|pack)\/@updf\/(?:text|layout|core)\//u;
const evidence = {
  scope: "Rich-inline continuation prerequisite ONLY; sibling Block/Flow integration is not implemented",
  cwd: process.cwd(),
  branch: manifest.branch,
  head: current.revision,
  status: execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }),
  inheritedChanges,
  hashes,
  freshConsumers: rows(current, consumers),
  libraryConsumers: rows(library, consumers),
  freshPackages: rows(current, packages),
  assertions:
    "222 fresh-before metrics equal historical; old inputs/tools/lock unchanged; paired final metrics identical; only six inherited files changed; core/other packages unchanged; no optional continuation graph in ordinary consumers",
};
await writeFile(root + "sibling-vs-before/evidence.json", JSON.stringify(evidence, null, 2));
console.log({
  assertions: evidence.assertions,
  freshConsumers: evidence.freshConsumers,
  freshPackages: evidence.freshPackages,
});
