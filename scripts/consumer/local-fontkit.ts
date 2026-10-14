import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { pack, root } from "./install.js";

interface InstalledPackage {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

async function installed(name: string, parent: string): Promise<{ path: string; metadata: InstalledPackage }> {
  const require = createRequire(join(parent, "package.json"));
  for (const base of require.resolve.paths(name) ?? []) {
    const path = join(base, name);
    try {
      const metadata: InstalledPackage = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
      assert.equal(metadata.name, name);
      return { path, metadata };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Missing installed dependency ${name} from ${parent}`);
}

async function closure(): Promise<readonly string[]> {
  const packages = new Map<string, { path: string; metadata: InstalledPackage }>();
  const pending = [{ name: "fontkit", parent: join(root, "packages/fontkit") }];
  while (pending.length) {
    const next = pending.pop();
    assert.ok(next);
    const item = await installed(next.name, next.parent);
    const previous = packages.get(next.name);
    if (previous) {
      // This fixture installs one version per name; fail rather than silently flatten conflicts.
      assert.equal(item.metadata.version, previous.metadata.version);
      continue;
    }
    packages.set(next.name, item);
    for (const name of Object.keys(item.metadata.dependencies ?? {})) pending.push({ name, parent: item.path });
  }
  assert.equal(packages.get("fontkit")?.metadata.version, "2.0.4");
  return [...packages.values()].map(({ path }) => path);
}

/** Exercise real tarball installation without registry or pre-existing npm-cache access. */
export async function installLocalFontkit(directory: string, destination: string): Promise<void> {
  const tarballs = await Promise.all((await closure()).map((path) => pack(relative(root, path), destination)));
  execFileSync(
    "npm",
    [
      "install",
      "--offline",
      "--cache",
      join(destination, "empty-cache"),
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...tarballs,
    ],
    { cwd: directory, stdio: "pipe" },
  );
}
