import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { assertJpegLockProvenance } from "./jpeg-lock-provenance.js";
import { jpegSourceInventory } from "./jpeg-source-provenance.js";

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
// This pinned revision predates the layout-boxes rename; its certified links stay historical.
for (const name of ["core", "fonts", "text", "layout-kernel"])
  assert.equal(await realpath(join(baseline, "node_modules/@updf", name)), join(baseline, "packages", name));
const beforeLock = JSON.parse(await readFile(join(baseline, "package-lock.json"), "utf8"));
const afterLock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
assertJpegLockProvenance(beforeLock, afterLock);
const files = await jpegSourceInventory(root, revision);
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
await mkdir("artifacts/jpeg-resources", { recursive: true });
await writeFile("artifacts/jpeg-resources/provenance.json", `${JSON.stringify(report, null, 2)}\n`);
console.log({ ...report, files: files.length });
