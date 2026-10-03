import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const compilerOptions = {
  target: "ES2022",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  lib: ["ES2022"],
  types: [],
  jsx: "react-jsx",
  jsxImportSource: "@updf/core",
  strict: true,
  noUncheckedIndexedAccess: true,
  exactOptionalPropertyTypes: true,
  noEmit: true,
};

test("separate temporary strict consumer resolves emitted package declarations and DX negatives", async () => {
  const directory = await mkdtemp("/tmp/opencode/updf-declarations-");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  try {
    await mkdir(join(directory, "node_modules/@updf"), { recursive: true });
    for (const name of ["core", "layout", "geometry", "svg", "fontkit"]) {
      await symlink(join(root, "packages", name), join(directory, "node_modules/@updf", name), "dir");
    }
    await symlink(join(root, "apps/cmr"), join(directory, "node_modules/@updf/example-cmr"), "dir");
    const names = [
      "native-template.ts",
      "measurement-template.tsx",
      "flow-template.tsx",
      "content-template.tsx",
      "mixed-template.tsx",
      "tables-template.tsx",
      "vdom-template.tsx",
      "fonts-template.ts",
      "painting-template.tsx",
      "svg-template.tsx",
    ];
    for (const name of names) {
      await writeFile(join(directory, name), await readFile(new URL(`types/${name}`, import.meta.url)));
    }
    await writeFile(join(directory, "package.json"), '{"type":"module"}\n');
    await writeFile(
      join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions,
        files: names,
      }),
    );
    const tsc = join(root, "node_modules/typescript/bin/tsc");
    execFileSync(process.execPath, [tsc, "-p", directory], { cwd: directory, stdio: "pipe" });
    const files = execFileSync(process.execPath, [tsc, "-p", directory, "--listFilesOnly"], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.ok(files.includes(join(root, "packages/core/dist/index.d.ts")));
    assert.ok(files.includes(join(root, "packages/svg/dist/tree.d.ts")));
    assert.ok(!files.includes("/src/") && !files.includes("@types/react") && !files.includes("@types/node"));
    const declarations = await readFile(join(root, "packages/core/dist/index.d.ts"), "utf8");
    assert.match(declarations, /render\(document: DocumentDefinition, options\?: RenderOptions\)/);
    assert.match(declarations, /renderUnknown\(document: unknown, options\?: RenderOptions\)/);
    assert.ok(!declarations.includes("CmrData"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
