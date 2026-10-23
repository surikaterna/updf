import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Inspect bodies as well as filenames: relocating optional methods must not hide retention. */
export async function sourceIndexGraph(modules: string[], code: string, optional: boolean, root = process.cwd()) {
  const behavior =
    /Inline source extent|Inline offset splits|exact inline source offset|sourceCursor|preparePositions/u;
  if (optional) {
    assert.ok(behavior.test(code), "Missing indexed-source positive control");
    return;
  }
  assert.ok(!behavior.test(code), "Ordinary bundle retains source indexing behavior");
  assert.ok(!modules.some((path) => /\/(?:indexed-selector|source-index)\.js$/u.test(path)));
  for (const path of modules.filter((path) => /\/text\/dist\//u.test(path)))
    assert.ok(!behavior.test(await readFile(resolve(root, path), "utf8")), "Ordinary module retains source indexing");
}
