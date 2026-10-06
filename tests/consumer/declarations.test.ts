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

const names = [
  "native-template.ts",
  "jpeg-template.tsx",
  "measurement-template.tsx",
  "flow-template.tsx",
  "content-template.tsx",
  "mixed-template.tsx",
  "tables-template.tsx",
  "vdom-template.tsx",
  "fonts-template.ts",
  "painting-template.tsx",
  "svg-template.tsx",
  "text-style-template.tsx",
  "rows-template.tsx",
  "page-break-template.tsx",
  "composable-tables-template.tsx",
  "auto-margin-template.tsx",
  "runtime-template.ts",
  "fontkit-template.ts",
];

function assertCanonicalDeclarations(files: string, root: string, name: string, entry: string): void {
  assert.ok(files.includes(join(root, `packages/${name}/dist/node/${entry}.d.mts`)));
  assert.ok(files.includes(join(root, `packages/${name}/dist/cjs/${entry}.d.ts`)));
}

async function prepareConsumer(directory: string, root: string): Promise<void> {
  await mkdir(join(directory, "node_modules/@updf"), { recursive: true });
  for (const name of [
    "core",
    "jpeg",
    "fonts",
    "text",
    "layout-kernel",
    "layout",
    "tables",
    "geometry",
    "svg",
    "fontkit",
  ]) {
    await symlink(join(root, "packages", name), join(directory, "node_modules/@updf", name), "dir");
  }
  await symlink(join(root, "apps/cmr"), join(directory, "node_modules/@updf/example-cmr"), "dir");
  for (const name of [...names, "text-options.ts", "layout-options.ts"]) {
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
}

test("temporary strict consumer resolves emitted declarations, DX negatives and executable compositions", async () => {
  const directory = await mkdtemp("/tmp/opencode/updf-declarations-");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  try {
    await prepareConsumer(directory, root);
    const tsc = join(root, "node_modules/typescript/bin/tsc");
    execFileSync(process.execPath, [tsc, "-p", directory], { cwd: directory, stdio: "pipe" });
    const files = execFileSync(process.execPath, [tsc, "-p", directory, "--listFilesOnly"], {
      cwd: directory,
      encoding: "utf8",
    });
    assertCanonicalDeclarations(files, root, "core", "index");
    assertCanonicalDeclarations(files, root, "svg", "tree");
    assert.ok(!files.includes("/src/") && !files.includes("@types/react") && !files.includes("@types/node"));
    const declarations = await readFile(join(root, "packages/core/dist/cjs/index.d.ts"), "utf8");
    assert.match(declarations, /render\(document: DocumentDefinition, options\?: RenderOptions\)/);
    assert.match(declarations, /renderUnknown\(document: unknown, options\?: RenderOptions\)/);
    assert.ok(!declarations.includes("CmrData"));
    execFileSync(
      process.execPath,
      [tsc, "-p", directory, "--noEmit", "false", "--outDir", "out", "--noUnusedLocals", "--noUnusedParameters"],
      { cwd: directory, stdio: "pipe" },
    );
    for (const name of names) {
      execFileSync(process.execPath, [join(directory, "out", name.replace(/\.tsx?$/u, ".js"))], {
        cwd: directory,
        stdio: "pipe",
      });
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
