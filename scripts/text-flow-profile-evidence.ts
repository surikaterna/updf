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
const before = await json("edge-profile-before/report.json");
const current = await json("edge-profile-vs-before/report.json");
const library = await json("edge-profile-vs-library/report.json");
const manifest = await json("edge-profile-before/manifest.json");
for (const field of ["versions", "flags", "lockSha256"]) assert.deepEqual(current[field], before[field], field);
for (const [key, contents] of Object.entries(before.inputs)) assert.equal(current.inputs[key], contents, key);
assert.deepEqual(current.metrics, library.metrics, "Both final cost runs must match");
assert.equal(await hash(root + "exclusion-optimized-vs-surgical/report.json"), manifest.historicalReportSha256);
const ordinary = /^consumer\/(?:drawing|ordinaryText|preparedFont|jpeg|layout)-/u;
const otherPackages = /^(?:emitted|pack)\/@updf\/(?!text(?:-flow)?\/)/u;
for (const [key, row] of Object.entries(current.comparison) as [string, { delta: number | null }][]) {
  if (ordinary.test(key) || otherPackages.test(key)) assert.equal(row.delta, 0, key);
}
const permitted = new Set([
  "scripts/package-edges.ts",
  "packages/text/test/exclusion.test.ts",
  "packages/text/src/composition-types.ts",
  "packages/text/src/composition.ts",
  "packages/text/src/composition-plan.ts",
  "packages/text/src/composition-exclusion.ts",
  "packages/text-flow/src/index.ts",
  "scripts/boundaries.ts",
  "scripts/graph-check.ts",
  "scripts/text-flow-costs.ts",
  "tests/integration/text-flow-graphs.test.ts",
]);
const changed = [];
for (const [path, old] of Object.entries(manifest.hashes)) {
  const current = await hash(path);
  if (current === old) continue;
  assert.ok(permitted.has(path), `Inherited file modified outside profile scope: ${path}`);
  changed.push({ path, before: old, current });
}
const paths = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const sources = Object.fromEntries(
  await Promise.all([...new Set(paths)].sort().map(async (path) => [path, await hash(path)])),
);
const rows = (report: typeof current) =>
  Object.fromEntries(
    Object.entries(report.comparison).filter(([key]) =>
      /^(?:consumer\/textFlow|total\/|pack\/@updf\/(?:text|text-flow)\/|emitted\/@updf\/(?:text|text-flow)\/)/u.test(
        key,
      ),
    ),
  );
const evidence = {
  cwd: process.cwd(),
  head: current.revision,
  versions: current.versions,
  status: execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }),
  baselineScopeChanges: changed,
  sources,
  freshDeltas: rows(current),
  libraryDeltas: rows(library),
  assertions:
    "All inherited files outside permitted integration unchanged; ordinary retained metrics and non-text/addon emitted/pack deltas zero; old inputs unchanged; final metric runs identical",
};
await writeFile(root + "edge-profile-vs-before/evidence.json", JSON.stringify(evidence, null, 2));
console.log({
  assertions: evidence.assertions,
  changedInherited: changed.map((row) => row.path),
  costs: Object.fromEntries(
    Object.entries(current.comparison).filter(([key]) =>
      /consumer\/textFlow(?:Exclusion)?-(?:browser|node)-min\//u.test(key),
    ),
  ),
});
console.log({
  packageDeltas: Object.fromEntries(
    Object.entries(current.comparison).filter(([key]) => /^(?:pack\/|emitted\/).*\/(?:text|text-flow)\//u.test(key)),
  ),
  inheritedOrdinaryTax: Object.fromEntries(
    Object.entries(library.comparison).filter(([key]) =>
      /consumer\/(?:ordinaryText|drawing|preparedFont|jpeg|layout)-(?:browser|node)-min\//u.test(key),
    ),
  ),
  profileAbsolute: Object.fromEntries(
    Object.entries(current.metrics).filter(([key]) => key.startsWith("consumer/textFlowProfile")),
  ),
});
