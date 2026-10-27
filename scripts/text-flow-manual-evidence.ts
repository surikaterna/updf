import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = process.cwd();
const directory = process.env.TEXT_FLOW_MANUAL_OUT ?? "artifacts/text-flow/manual-shapes-fixed";
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const before = await read("artifacts/text-flow/manual-shapes-before/manifest.json");
const prior = await read("artifacts/text-flow/manual-shapes-final/preservation.json");
const changed: string[] = [];
for (const path of [...before.history, ...before.dist]) {
  if (hash(await readFile(path)) !== before.hashes[path]) changed.push(path);
}
assert.deepEqual(changed, [], "Protected historical/dist hashes changed");
assert.equal(hash(await readFile("package-lock.json")), before.lock);
const pid = execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" });
assert.equal(pid, before.pid);
const urls = [];
for (const entry of before.urls) {
  const response = await fetch(`http://100.74.77.69:5182/updf/${entry.path}`, { signal: AbortSignal.timeout(5000) });
  const current = {
    path: entry.path,
    status: response.status,
    hash: hash(new Uint8Array(await response.arrayBuffer())),
  };
  assert.equal(current.status, 200);
  assert.equal(current.hash, entry.hash);
  urls.push(current);
}
const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" });
assert.equal(execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" }), "");
const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
assert.equal(branch, "feature/text-flow-design");
const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const hashes = Object.fromEntries(await Promise.all(paths.map(async (path) => [path, hash(await readFile(path))])));
const changedSincePriorFinal = paths.filter((path) => hashes[path] !== prior.hashes[path]);
const allowed = new Set([
  "packages/text-flow/src/source-capture.ts",
  "packages/text-flow/src/path-entry.ts",
  "packages/text-flow/src/component-owner.ts",
  "packages/text-flow/src/handlers.ts",
  "packages/text-flow/test/own-source-handlers.test.ts",
  "scripts/text-flow-manual-evidence.ts",
  "scripts/text-flow-manual-summary.ts",
  "scripts/text-flow-manual-parity.ts",
  "docs/evidence/text-flow-manual-shapes.md",
]);
assert.deepEqual(
  changedSincePriorFinal.filter((path) => !allowed.has(path)),
  [],
  "Changes outside must-fix ownership",
);
const patch = execFileSync("git", ["diff", "--binary", "HEAD"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/final.patch`, patch);
await writeFile(
  `${directory}/preservation.json`,
  JSON.stringify(
    {
      root,
      branch,
      issue: "N/A",
      staged: [],
      trackedUnstaged: status.split("\n").filter((line) => line.startsWith(" M ")).length,
      untracked: status.split("\n").filter((line) => line.startsWith("?? ")).length,
      changedSinceS2: paths.filter((path) => hashes[path] !== before.hashes[path]),
      changedSincePriorFinal,
      patchSha256: hash(patch),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      status,
      hashes,
      history: before.history.length,
      dist: before.dist.length,
      pid,
      urls,
      lock: before.lock,
    },
    null,
    2,
  ),
);
console.log({
  preservation: "pass",
  history: before.history.length,
  dist: before.dist.length,
  sourcePaths: paths.length,
  urls: urls.length,
});
