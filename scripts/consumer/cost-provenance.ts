import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const baseline = resolve(process.argv[2] ?? "");
const revision = "f347be43b245f6420818e0eb072a6877877af24a";
const inventory = execFileSync("git", ["ls-tree", "-r", "--format=%(objectname) %(path)", revision], {
  encoding: "utf8",
});
for (const line of inventory.trim().split("\n")) {
  const oid = line.slice(0, 40),
    path = line.slice(41);
  const bytes = await readFile(join(baseline, path));
  const actual = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(actual, oid, `Baseline tracked source changed: ${path}`);
}
for (const name of ["fonts", "text"]) await assert.rejects(readFile(join(baseline, "packages", name, "package.json")));
// This pinned revision predates the layout-boxes rename; its certified links stay historical.
for (const name of ["core", "layout-kernel", "fontkit"]) {
  const link = await realpath(join(baseline, "node_modules/@updf", name));
  assert.equal(link, join(baseline, "packages", name));
}
for (const name of ["typescript", "esbuild", "vite"]) {
  const before = JSON.parse(await readFile(join(baseline, "node_modules", name, "package.json"), "utf8"));
  const after = JSON.parse(await readFile(join("node_modules", name, "package.json"), "utf8"));
  assert.equal(before.version, after.version, `Cost tool mismatch: ${name}`);
}
const manifest = JSON.parse(await readFile(join(baseline, "packages/core/package.json"), "utf8"));
assert.equal(manifest.exports["./fonts"].browser.default, "./dist/fonts/index.js");
assert.equal(manifest.exports["./measurement"].browser.default, "./dist/measurement/index.js");
const evidence = {
  revision,
  baseline,
  node: process.version,
  trackedFiles: inventory.trim().split("\n").length,
  sourceInventorySha256: createHash("sha256").update(inventory).digest("hex"),
  conditions: ["browser"],
  toolVersionsMatch: true,
  isolatedWorkspaceLinks: true,
};
await writeFile("artifacts/font-extraction/develop-provenance.json", `${JSON.stringify(evidence, null, 2)}\n`);
console.log(evidence);
