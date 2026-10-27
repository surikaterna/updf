import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const target = "/home/sprawl/projects/updf/trees/image-preparation";
const source = "/home/sprawl/projects/updf/trees/text-flow-design";
assert.equal(process.cwd(), target);
const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
const baseline = await read("/tmp/opencode/updf-s5b1-fidelity/source-manifest.json");
const allowed = new Set([
  "packages/core/package.json",
  "packages/core/src/types.ts",
  "packages/core/src/vdom/normalize.ts",
  "packages/core/src/vdom/data.ts",
  "packages/core/src/vdom/state.ts",
  "packages/core/src/vdom/measurement.ts",
  "packages/core/src/core/layout-operation.ts",
  "packages/core/src/internal.ts",
  "packages/layout/package.json",
  "packages/layout/src/mixed-layout.ts",
  "packages/layout/src/content-normalize.ts",
  "packages/layout/src/content-block-parts.ts",
  "scripts/boundaries.ts",
]);
const changed: string[] = [];
for (const [path, entry] of Object.entries(baseline) as [string, { sha256: string }][]) {
  assert.equal(hash(await readFile(join(source, path))), entry.sha256, `Read-only source changed: ${path}`);
  if (hash(await readFile(join(target, path))) === entry.sha256) continue;
  assert.ok(allowed.has(path), `Target inherited file changed outside S5b.1: ${path}`);
  changed.push(path);
}
assert.equal(
  git(source, "status", "--porcelain=v1", "--untracked-files=all"),
  await readFile("/tmp/opencode/updf-s5b1-fidelity/source-status.txt", "utf8"),
);
const original = await read("/tmp/opencode/updf-s5a1-before-20261023/manifest.json");
for (const path of [...original.history, ...original.dist])
  assert.equal(
    hash(await readFile(join(source, path))),
    original.hashes[path],
    `Protected source artifact changed: ${path}`,
  );
const urls = [];
for (const previous of original.urls) {
  const response = await fetch(`http://100.74.77.69:5182/updf/${previous.path}`, { signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200);
  const digest = hash(new Uint8Array(await response.arrayBuffer()));
  assert.equal(digest, previous.hash);
  urls.push({ path: previous.path, status: response.status, hash: digest });
}
const inventory = git(target, "ls-files", "--cached", "--others", "--exclude-standard").trimEnd().split("\n");
const result = {
  target,
  source,
  branch: git(target, "branch", "--show-current").trim(),
  head: git(target, "rev-parse", "HEAD").trim(),
  sourceFilesPreserved: Object.keys(baseline).length,
  changed,
  added: inventory.filter((path) => !Object.hasOwn(baseline, path)),
  staged: git(target, "diff", "--cached", "--name-only"),
  status: git(target, "status", "--short"),
  hashes: Object.fromEntries(await Promise.all(inventory.map(async (path) => [path, hash(await readFile(path))]))),
  protectedHistory: original.history.length,
  protectedDist: original.dist.length,
  urls,
  pid: execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" }).trim(),
};
const out = process.argv[2] ?? "artifacts/private-preparation-after";
await mkdir(out, { recursive: true });
await writeFile(`${out}/preservation.json`, JSON.stringify(result, null, 2));
console.log({ ...result, hashes: undefined, status: undefined });
