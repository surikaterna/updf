import assert from "node:assert/strict";
import { posix, win32 } from "node:path";
import test from "node:test";
import ts from "typescript";
import { commonJSOutputPath } from "../../scripts/packaging/commonjs-path.js";

for (const [platform, paths, root, out] of [
  ["POSIX", posix, "/repo/package/src", "/repo/package/dist"],
  ["Windows", win32, "C:\\repo\\package\\src", "C:\\repo\\package\\dist"],
] as const) {
  test(`${platform} CJS selection preserves relative output and rejects non-source paths`, () => {
    const select = (fileName: string, isDeclarationFile = false) =>
      commonJSOutputPath({ fileName, isDeclarationFile }, root, out, paths);
    for (const relative of ["index.ts", "nested/index.ts", "..internal/index.ts", "nested/../index.ts"]) {
      assert.equal(select(paths.join(root, relative)), paths.join(out, "cjs", relative.replace(/\.ts$/u, ".js")));
    }
    for (const fileName of [root, paths.dirname(root), `${root}-sibling/index.ts`, `${root}/../outside.ts`])
      assert.equal(select(fileName), undefined, fileName);
    assert.equal(select(paths.join(root, "index.d.ts"), true), undefined);
    assert.equal(select(paths.join(root, "index.ts"), true), undefined);
  });
}

test("Windows CJS selection supports mixed separators, normalized TypeScript paths and different drives", () => {
  const root = "C:\\repo\\package\\src";
  const out = "C:\\repo\\package\\dist";
  for (const fileName of ["C:/repo/package/src/nested/index.ts", "C:\\repo/package\\src/nested\\index.ts"]) {
    assert.equal(
      commonJSOutputPath({ fileName, isDeclarationFile: false }, root, out, win32),
      "C:\\repo\\package\\dist\\cjs\\nested\\index.js",
    );
  }
  for (const fileName of ["D:/repo/package/src/index.ts", "C:/repo/package/src/../outside.ts"]) {
    assert.equal(commonJSOutputPath({ fileName, isDeclarationFile: false }, root, out, win32), undefined);
  }
});

test("TypeScript normalizes Windows config roots and program filenames to forward slashes", () => {
  const cwd = "C:\\repo\\package";
  const text = "export const value = 1;";
  const config = ts.parseJsonConfigFileContent(
    { compilerOptions: { rootDir: "src", outDir: "dist", noLib: true }, files: ["src/index.ts"] },
    { useCaseSensitiveFileNames: false, readDirectory: () => [], fileExists: () => true, readFile: () => text },
    cwd,
  );
  assert.deepEqual(config.errors, []);
  const host = ts.createCompilerHost(config.options);
  host.getCurrentDirectory = () => cwd;
  host.fileExists = () => true;
  host.readFile = () => text;
  host.getSourceFile = (name, version) => ts.createSourceFile(name, text, version);
  const program = ts.createProgram(config.fileNames, config.options, host);
  const [source] = program.getSourceFiles();
  assert.ok(source);
  assert.equal(config.options.rootDir, "C:/repo/package/src");
  assert.equal(source.fileName, "C:/repo/package/src/index.ts");
  assert.ok(source.fileName.startsWith(`${config.options.rootDir}/`));
  assert.equal(
    commonJSOutputPath(source, config.options.rootDir, "C:/repo/package/dist", win32),
    "C:\\repo\\package\\dist\\cjs\\index.js",
  );
});
