import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { layoutPackageDirectory, layoutPackageTarball } from "../../scripts/layout-package-identity.js";

const version = "2.0.0-poc.0";

async function fixture(root: string, name: string, identity = name, packageVersion = version) {
  const directory = join(root, "packages", name);
  await mkdir(directory, { recursive: true });
  const manifest = JSON.stringify({ name: `@updf/${identity}`, version: packageVersion });
  await writeFile(join(directory, "package.json"), manifest);
  await mkdir(join(root, "package"), { recursive: true });
  await writeFile(join(root, "package/package.json"), manifest);
  const tarball = join(root, `updf-${name}-${version}.tgz`);
  execFileSync("tar", ["-czf", tarball, "-C", root, "package/package.json"]);
  return tarball;
}

for (const name of ["layout-kernel", "layout-boxes"]) {
  test(`historical script directory and tarball dispatch: ${name}`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "layout-identity-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const tarball = await fixture(root, name);
    assert.equal(await layoutPackageDirectory(root), name);
    assert.equal(await layoutPackageTarball(root, version), tarball);
  });
}

test("historical script dispatch rejects missing and ambiguous identities", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "layout-identity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(layoutPackageDirectory(root), /exactly one/);
  await assert.rejects(layoutPackageTarball(root, version), /exactly one/);
  await fixture(root, "layout-kernel");
  await fixture(root, "layout-boxes");
  await assert.rejects(layoutPackageDirectory(root), /exactly one/);
  await assert.rejects(layoutPackageTarball(root, version), /exactly one/);
});

test("historical script dispatch rejects mislabeled manifests and tarball versions", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "layout-identity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await fixture(root, "layout-kernel", "layout-boxes");
  await assert.rejects(layoutPackageDirectory(root), /identity mismatch/);
  await assert.rejects(layoutPackageTarball(root, version), /identity mismatch/);
  await fixture(root, "layout-kernel", "layout-kernel", "wrong-version");
  await assert.rejects(layoutPackageTarball(root, version), /version mismatch/);
});
