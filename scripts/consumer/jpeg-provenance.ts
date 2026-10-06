import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const baseline = resolve(process.argv[2] ?? "");
const revision = "bb8395b07be4586ea3be181625de1e71ed301d37";
const root = process.cwd();
const inventory = execFileSync("git", ["ls-tree", "-r", "--format=%(objectname) %(path)", revision], {
  encoding: "utf8",
});
for (const line of inventory.trim().split("\n")) {
  const bytes = await readFile(join(baseline, line.slice(41)));
  const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(actual, line.slice(0, 40), `Baseline source changed: ${line.slice(41)}`);
}
const tools: Record<string, string> = {};
for (const name of ["typescript", "esbuild", "vite", "@biomejs/biome"]) {
  const before = JSON.parse(await readFile(join(baseline, "node_modules", name, "package.json"), "utf8"));
  const after = JSON.parse(await readFile(join(root, "node_modules", name, "package.json"), "utf8"));
  assert.equal(before.version, after.version, `Tool mismatch: ${name}`);
  tools[name] = after.version;
}
for (const name of ["core", "fonts", "text", "layout-kernel"])
  assert.equal(await realpath(join(baseline, "node_modules/@updf", name)), join(baseline, "packages", name));
const beforeLock = JSON.parse(await readFile(join(baseline, "package-lock.json"), "utf8"));
const afterLock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
for (const [path, record] of Object.entries(beforeLock.packages))
  assert.deepEqual(afterLock.packages[path], record, path);
assert.deepEqual(
  Object.keys(afterLock.packages)
    .filter((path) => !(path in beforeLock.packages))
    .sort(),
  ["node_modules/@updf/jpeg", "packages/jpeg"],
);
const paths = execFileSync("git", ["ls-files", "--modified", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const files = [];
for (const path of [...new Set(paths)].sort()) {
  const bytes = await readFile(join(root, path));
  files.push({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const report = {
  root,
  baseline,
  revision,
  node: process.version,
  tools,
  baselineTrackedFiles: inventory.trim().split("\n").length,
  sourceInventorySha256: createHash("sha256").update(inventory).digest("hex"),
  registryRecordsUnchanged: true,
  addedLockRecords: ["node_modules/@updf/jpeg", "packages/jpeg"],
  status: execFileSync("git", ["status", "--short", "--untracked-files=all"], { encoding: "utf8" }),
  files,
};
await writeFile("artifacts/jpeg-resources/provenance.json", `${JSON.stringify(report, null, 2)}\n`);
console.log({ ...report, files: files.length });
