import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

interface Entry {
  browser: { types: string; default: string };
  import: { types: string; default: string };
  require: { types: string; default: string };
}

async function emitCommonJS(source: ts.SourceFile, root: string, out: string): Promise<void> {
  const path = join(out, "cjs", relative(root, source.fileName).replace(/\.ts$/u, ".js"));
  const result = ts.transpileModule(source.text, {
    fileName: source.fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      sourceMap: false,
    },
  });
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, result.outputText);
}

function valueExports(program: ts.Program, source: ts.SourceFile): string[] {
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(source);
  assert.ok(module, `Missing checked module: ${source.fileName}`);
  return checker
    .getExportsOfModule(module)
    .filter((symbol) => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return Boolean(target.flags & ts.SymbolFlags.Value);
    })
    .map((symbol) => symbol.name)
    .sort();
}

async function facade(program: ts.Program, entry: Entry, out: string, root: string): Promise<void> {
  const path = entry.browser.default.replace(/^\.\/dist\//u, "");
  const source = program.getSourceFile(join(root, path.replace(/\.js$/u, ".ts")));
  assert.ok(source, `Export must correspond to checked source: ${path}`);
  const names = valueExports(program, source);
  assert.ok(!names.includes("default"), "Native packages must not introduce a default API");
  const prefix = "../".repeat(path.split("/").length - 1);
  const implementation = `${prefix}../cjs/${path}`;
  const runtime = `import implementation from ${JSON.stringify(implementation)};\n${names.map((name) => `export const ${name} = implementation.${name};`).join("\n")}\n`;
  const declaration = `export * from ${JSON.stringify(implementation)};\n`;
  const target = join(out, "node", path.replace(/\.js$/u, ".mjs"));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, runtime);
  await writeFile(target.replace(/\.mjs$/u, ".d.mts"), declaration);
  await writeFile(target.replace(/\.mjs$/u, ".d.cts"), declaration);
}

async function build(): Promise<void> {
  const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  assert.equal(configFile.error, undefined);
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
  assert.equal(config.errors.length, 0);
  const out = config.options.outDir;
  const root = config.options.rootDir;
  assert.ok(out && root);
  await rm(out, { recursive: true, force: true });
  const program = ts.createProgram(config.fileNames, config.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (path) => path,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    }),
  );
  const emitted: Promise<void>[] = [];
  program.emit(undefined, (path, data) => {
    emitted.push(mkdir(dirname(path), { recursive: true }).then(() => writeFile(path, data)));
    if (path.endsWith(".d.ts")) {
      const canonical = join(out, "cjs", relative(out, path));
      emitted.push(mkdir(dirname(canonical), { recursive: true }).then(() => writeFile(canonical, data)));
    }
  });
  await Promise.all(emitted);
  for (const source of program
    .getSourceFiles()
    .filter((file) => file.fileName.startsWith(`${root}/`) && !file.isDeclarationFile))
    await emitCommonJS(source, root, out);
  await writeFile(join(out, "cjs", "package.json"), '{"type":"commonjs"}\n');
  const manifest: { exports: Record<string, Entry> } = JSON.parse(await readFile("package.json", "utf8"));
  for (const entry of Object.values(manifest.exports)) await facade(program, entry, out, root);
}

await build();
