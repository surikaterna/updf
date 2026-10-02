import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { join } from "node:path";

export const internalImporters: Readonly<Record<string, readonly string[]>> = {
  "@updf/core/internal": [
    "geometry/src/arc.ts",
    "geometry/src/color.ts",
    "geometry/src/normalize.ts",
    "geometry/src/scanner.ts",
    "geometry/src/shapes.ts",
    "svg/src/compile.ts",
    "svg/src/declaration.ts",
    "svg/src/index.ts",
    "svg/src/style.ts",
    "svg/src/transform.ts",
    "svg/src/viewport.ts",
    "fontkit/src/cmap.ts",
    "fontkit/src/index.ts",
    "fontkit/src/metadata.ts",
    "fontkit/src/sfnt.ts",
  ],
  "@updf/geometry/internal": ["svg/src/numbers.ts"],
};

export function allowedInternal(file: string, specifier: string): void {
  const allowed = internalImporters[specifier];
  assert.ok(allowed?.includes(file), `Forbidden internal importer: ${file} -> ${specifier}`);
}

export function internalExports(text: string, expected: readonly string[]): void {
  const names = [...text.matchAll(/export (?:type )?\{([^}]+)\}/gu)].flatMap((match) =>
    (match[1] ?? "").split(",").map((name) => name.trim().replace(/^type /u, "")),
  );
  assert.deepEqual(names.sort(), [...expected].sort(), "Internal export inventory expanded");
  assert.ok(!/export\s+\*/u.test(text), "Internal wildcard export");
}

export async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result.sort();
}

export function portableGraph(modules: readonly string[], optional = false, react = false): void {
  assert.ok(
    !modules.some(
      (id) => isBuiltin(id) || id === "Buffer" || id === "process" || /(?:packages\/legacy|@updf\/legacy)/u.test(id),
    ),
    "Native closure must be portable and nonlegacy",
  );
  if (!optional)
    assert.ok(!modules.some((id) => /fontkit|restructure|brotli|unicode-trie/iu.test(id)), "Optional parser leaked");
  if (!react) assert.ok(!modules.some((id) => /(?:^|\/)(?:react|react-dom)(?:\/|$)/u.test(id)), "React leaked");
}

export async function checkSeams(root: string): Promise<void> {
  internalExports(await readFile(join(root, "packages/core/src/internal.ts"), "utf8"), [
    "DocumentError",
    "fail",
    "array",
    "finite",
    "number",
    "record",
    "matrix",
    "commands",
    "paint",
    "byteLength",
    "scalar",
    "ResolvedPaint",
  ]);
  internalExports(await readFile(join(root, "packages/geometry/src/internal.ts"), "utf8"), [
    "hasArguments",
    "numeric",
    "whitespace",
    "Scanner",
  ]);
  for (const owner of ["core", "geometry", "svg", "fontkit"]) {
    for (const path of await files(join(root, "packages", owner, "src"))) {
      const text = await readFile(path, "utf8");
      for (const match of text.matchAll(/from ['"](@updf\/[^'"]+\/internal)['"]/gu)) {
        const specifier = match[1];
        assert.ok(specifier);
        allowedInternal(path.slice(join(root, "packages").length + 1), specifier);
      }
      assert.ok(!/from ['"]\.\.\/\.\.\//u.test(text), `Source crosses package via relative path: ${path}`);
    }
  }
}
