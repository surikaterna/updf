import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { portableGraph } from "../boundaries.js";

async function publicFile(directory: string, specifier: string): Promise<string> {
  const [scope, name, ...subpath] = specifier.split("/");
  assert.ok(scope && name);
  const packageRoot = join(directory, "node_modules", scope, name);
  const manifest: { exports: Record<string, { import: string }> } = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  const entry = manifest.exports[subpath.length ? `./${subpath.join("/")}` : "."];
  assert.ok(entry, `Missing explicit export: ${specifier}`);
  return join(packageRoot, entry.import);
}

export async function installedGraph(directory: string, entry: string, optional = false): Promise<readonly string[]> {
  const visited = new Set<string>();
  const queue = [await publicFile(directory, entry)];
  while (queue.length) {
    const path = queue.pop();
    assert.ok(path);
    if (visited.has(path)) continue;
    visited.add(path);
    const text = await readFile(path, "utf8");
    assert.ok(!/\b(?:Buffer|process)\s*[.(]/u.test(text), `Native ambient runtime: ${path}`);
    for (const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/gu)) {
      const specifier = match[1];
      assert.ok(specifier);
      if (specifier.startsWith(".")) queue.push(resolve(dirname(path), specifier));
      else if (specifier.startsWith("@updf/")) queue.push(await publicFile(directory, specifier));
      else {
        portableGraph([specifier], optional);
        visited.add(specifier);
      }
    }
  }
  const modules = [...visited].map((path) => path.replace(`${directory}/node_modules/`, ""));
  portableGraph(modules, optional);
  if (!entry.startsWith("@updf/svg")) assert.ok(!modules.some((path) => path.startsWith("@updf/svg/")), "SVG leaked");
  if (entry.startsWith("@updf/core"))
    assert.ok(!modules.some((path) => path.startsWith("@updf/geometry/")), "Geometry leaked");
  if (entry.startsWith("@updf/core"))
    assert.ok(
      modules
        .filter((path) => path.startsWith("@updf/layout-kernel/"))
        .every((path) => path === "@updf/layout-kernel/dist/arithmetic.js"),
      "Non-arithmetic kernel code leaked into core",
    );
  return modules;
}
