import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const source = "/home/sprawl/projects/updf/trees/text-flow-design";
const out = "artifacts/visual-preparation-bridge-fixed";
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const original = await read("/tmp/opencode/updf-s5b1-fidelity/source-manifest.json");
for (const [path, entry] of Object.entries(original) as [string, { sha256: string }][]) {
  assert.equal(hash(await readFile(join(source, path))), entry.sha256, path);
}
assert.equal(
  execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: source, encoding: "utf8" }),
  await readFile("/tmp/opencode/updf-s5b1-fidelity/source-status.txt", "utf8"),
);
const protectedFiles = await read("/tmp/opencode/updf-s5a1-before-20261023/manifest.json");
for (const path of [...protectedFiles.history, ...protectedFiles.dist])
  assert.equal(hash(await readFile(join(source, path))), protectedFiles.hashes[path], path);
// This test/cost-only correction does not contact the original live asset server.
const before = await read("artifacts/visual-preparation-bridge-after/source.json");
const after = await read(`${out}/source.json`);
const entries = Object.entries(after.hashes)
  .filter(([path, digest]) => before.hashes[path] !== digest)
  .map(([path, digest]) => ({ path, before: before.hashes[path] ?? null, after: digest }));
const allowed = [
  "scripts/visual-preparation-receipts.ts",
  "scripts/visual-preparation-cost-input.ts",
  "scripts/visual-preparation-evidence.ts",
  "scripts/visual-preparation-preservation.ts",
  "tests/browser/visual-preparation.test.ts",
  "docs/evidence/url-image-preparation.md",
];
assert.deepEqual(entries.map((entry) => entry.path).sort(), allowed.sort());
assert.ok(Object.keys(before.hashes).every((path) => Object.hasOwn(after.hashes, path)));
const distBefore = await read(`${out}/dist-before.json`);
const distAfter = await read(`${out}/dist-final.json`);
assert.deepEqual(distAfter, distBefore);
for (const [path, digest] of Object.entries(distAfter)) assert.equal(hash(await readFile(path)), digest, path);
assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" }), "");
assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: source, encoding: "utf8" }), "");
const receipt = {
  originalSources: Object.keys(original).length,
  baselineSources: before.sourceCount,
  protectedHistory: protectedFiles.history.length,
  protectedDist: protectedFiles.dist.length,
  liveAssetRequests: 0,
  targetDistributionFiles: Object.keys(distAfter).length,
  productionSourceChanges: entries.filter(({ path }) => path.startsWith("packages/")).length,
  pid: execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" }).trim(),
  entries,
  scopeHash: hash(Buffer.from(JSON.stringify(entries))),
};
await writeFile(`${out}/preservation.json`, JSON.stringify(receipt, null, 2));
console.log(receipt);
