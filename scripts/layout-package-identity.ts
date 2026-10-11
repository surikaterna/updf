import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

// Certified historical roots/tarballs keep layout-kernel; this is script dispatch,
// not a compatibility alias for the current layout-boxes package.
const identities = ["layout-kernel", "layout-boxes"] as const;

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function single<T>(matches: T[], root: string): T {
  assert.equal(matches.length, 1, `Expected exactly one layout package identity in ${root}`);
  return matches[0]!;
}

export async function layoutPackageDirectory(root: string): Promise<string> {
  const matches = [];
  for (const name of identities) {
    const manifestPath = resolve(root, "packages", name, "package.json");
    if (!(await exists(manifestPath))) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.name, `@updf/${name}`, `Layout manifest identity mismatch: ${manifestPath}`);
    matches.push(name);
  }
  return single(matches, root);
}

export async function layoutPackageTarball(root: string, version: string): Promise<string> {
  const matches = [];
  for (const name of identities) {
    const path = resolve(root, `updf-${name}-${version}.tgz`);
    if (!(await exists(path))) continue;
    const manifest = JSON.parse(execFileSync("tar", ["-xOf", path, "package/package.json"], { encoding: "utf8" }));
    assert.equal(manifest.name, `@updf/${name}`, `Layout tarball identity mismatch: ${path}`);
    assert.equal(manifest.version, version, `Layout tarball version mismatch: ${path}`);
    matches.push(path);
  }
  return single(matches, root);
}
