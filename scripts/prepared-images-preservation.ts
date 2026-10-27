import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const before = await read("artifacts/text-flow/image-visual-seam-final/preservation.json");
const original = await read("/tmp/opencode/updf-s5a1-before-20261023/manifest.json");
const preFix = await read("artifacts/text-flow/prepared-images/preservation.json");
const fixPaths = new Set([
  "docs/evidence/prepared-images.md",
  "packages/layout/src/container-producer.ts",
  "packages/layout/src/visual-content-height.ts",
  "packages/layout/test/visual-content-height.test.ts",
  "packages/images/test/render.test.ts",
  "packages/images/test/float.test.ts",
  "tests/browser/prepared-images.test.ts",
  "scripts/prepared-images-evidence.ts",
  "scripts/prepared-images-clean-build.ts",
  "scripts/prepared-images-preservation.ts",
]);
const fixChanged = [];
for (const [path, previous] of Object.entries(preFix.hashes)) {
  if (hash(await readFile(path)) === previous) continue;
  assert.ok(fixPaths.has(path), `Source changed outside R1: ${path}`);
  fixChanged.push(path);
}
const owned = new Set([
  "biome.json",
  "package.json",
  "package-lock.json",
  "packages/layout/src/block-compiler.ts",
  "packages/layout/src/blocks.ts",
  "packages/layout/src/container-producer.ts",
  "packages/layout/src/extension-producer.ts",
  "packages/layout/src/internal-visual.ts",
  "scripts/boundaries.ts",
  "scripts/package-edges.ts",
  "scripts/check-licenses.ts",
  "docs/evidence/prepared-images.md",
  "packages/layout/test/visual-content-height.test.ts",
  "packages/images/test/render.test.ts",
  "packages/images/test/float.test.ts",
  "scripts/prepared-images-evidence.ts",
  "scripts/prepared-images-clean-build.ts",
  "scripts/prepared-images-preservation.ts",
  "tests/browser/prepared-images.test.ts",
]);
const changed = [];
for (const [path, previous] of Object.entries(before.hashes)) {
  if (hash(await readFile(path)) === previous) continue;
  assert.ok(owned.has(path), `Inherited source changed outside S5a2: ${path}`);
  changed.push(path);
}
for (const path of [...original.history, ...original.dist])
  assert.equal(hash(await readFile(path)), original.hashes[path], path);
const urls = [];
for (const prior of original.urls) {
  const response = await fetch(`http://100.74.77.69:5182/updf/${prior.path}`, { signal: AbortSignal.timeout(3000) });
  assert.equal(response.status, 200);
  const digest = hash(new Uint8Array(await response.arrayBuffer()));
  assert.equal(digest, prior.hash);
  urls.push({ path: prior.path, status: response.status, hash: digest });
}
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trimEnd();
const source = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n");
const hashes = Object.fromEntries(await Promise.all(source.map(async (path) => [path, hash(await readFile(path))])));
const added = source.filter((path) => !Object.hasOwn(before.hashes, path));
const result = {
  root: process.cwd(),
  head: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  status: git("status", "--short"),
  changed,
  fixChanged,
  added,
  hashes,
  baselineSourceCount: Object.keys(before.hashes).length,
  protectedHistory: original.history.length,
  protectedServedFiles: original.dist.length,
  urls,
  pid: execFileSync("ps", ["-p", "665048", "-o", "pid=,args="], { encoding: "utf8" }).trim(),
};
const out = process.env.PREPARED_IMAGES_OUT ?? "artifacts/text-flow/prepared-images";
await mkdir(out, { recursive: true });
await writeFile(`${out}/preservation.json`, JSON.stringify(result, null, 2));
console.log({
  changed,
  added,
  baselineSourceCount: result.baselineSourceCount,
  protectedHistory: result.protectedHistory,
  protectedServedFiles: result.protectedServedFiles,
  urls,
  pid: result.pid,
});
