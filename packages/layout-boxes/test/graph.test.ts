import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { kernelProfile } from "../../../scripts/kernel-profile.js";

test("neutral public kernel bundle has positive allocator/numeric bytes and no external or forbidden source", async () => {
  const result = await kernelProfile();
  assert.ok(result.raw > 0 && result.gzip > 0);
});
test("kernel manifest, ES-only declarations, build config and license are independently owned", async () => {
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(manifest.name, "@updf/layout-boxes");
  assert.equal(manifest.version, "2.0.0-poc.0");
  assert.equal(manifest.private, true);
  assert.equal(manifest.license, "MIT");
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"])
    assert.equal(field in manifest, false);
  assert.deepEqual(Object.keys(manifest.exports), [
    ".",
    "./arithmetic",
    "./geometry",
    "./boxes",
    "./fragmentation",
    "./numeric",
  ]);
  assert.equal(
    await readFile(new URL("LICENSE", root), "utf8"),
    await readFile(new URL("../../LICENSE", root), "utf8"),
  );
  const config = JSON.parse(await readFile(new URL("tsconfig.json", root), "utf8"));
  assert.deepEqual(config.compilerOptions.lib, ["ES2022"]);
  assert.deepEqual(config.compilerOptions.types, []);
  const declarations = await readFile(new URL("dist/index.d.ts", root), "utf8");
  assert.doesNotMatch(declarations, /@updf\/core|\b(?:Buffer|NodeJS|React|Document|HTMLElement)\b/u);
});
