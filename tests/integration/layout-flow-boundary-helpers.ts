import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const seam = "packages/layout/src/flow-runtime";
const fixture = "tests/fixtures/layout-flow-native-free.ts";

export function boundaryFixture(profile: "runtime" | "stack-model" = "runtime") {
  const source = profile === "runtime" ? seam : "packages/layout/src/flow-composition";
  const consumer = profile === "runtime" ? fixture : "tests/fixtures/layout-stack-model-native-free.ts";
  const directory = mkdtempSync(join(tmpdir(), "updf-flow-boundary-"));
  cpSync(join(root, source), join(directory, source), { recursive: true });
  mkdirSync(join(directory, dirname(consumer)), { recursive: true });
  cpSync(join(root, consumer), join(directory, consumer));
  const arithmetic = "packages/layout-boxes/src/arithmetic.ts";
  if (profile === "stack-model") {
    mkdirSync(join(directory, dirname(arithmetic)), { recursive: true });
    cpSync(join(root, arithmetic), join(directory, arithmetic));
  }
  writeFileSync(join(directory, "package.json"), '{"type":"module"}');
  return {
    directory,
    profile,
    arithmetic: join(directory, arithmetic),
    seam: join(directory, source),
    entry: join(directory, consumer),
    output: join(directory, "out"),
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

export function compileBoundary(fixture: ReturnType<typeof boundaryFixture>, injectedHost = false): string {
  const options: ts.CompilerOptions = {
    strict: true,
    types: [],
    lib: ["lib.es2022.d.ts"],
    skipLibCheck: false,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    declaration: true,
    rootDir: fixture.directory,
    outDir: fixture.output,
    ...(fixture.profile === "stack-model" ? { paths: { "@updf/layout-boxes/arithmetic": [fixture.arithmetic] } } : {}),
  };
  const program = ts.createProgram([fixture.entry], options);
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...program.emit().diagnostics];
  assert.equal(
    diagnostics.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => fixture.directory,
      getCanonicalFileName: (path) => path,
      getNewLine: () => "\n",
    }),
  );
  const libDirectory = dirname(ts.getDefaultLibFilePath(options));
  for (const source of program.getSourceFiles()) {
    if (program.isSourceFileDefaultLibrary(source)) {
      assert.equal(dirname(source.fileName), libDirectory);
      assert.match(source.fileName, /[/\\]lib\.(es[\w.]*|decorators(\.legacy)?)\.d\.ts$/);
    } else if (!injectedHost) {
      assert.ok(
        source.fileName === fixture.entry ||
          (fixture.profile === "runtime"
            ? source.fileName.startsWith(`${fixture.seam}${sep}`)
            : source.fileName === join(fixture.seam, "stack-model.ts") || source.fileName === fixture.arithmetic),
        `Source boundary leak: ${source.fileName}`,
      );
    }
  }
  return join(
    fixture.output,
    "tests/fixtures",
    fixture.profile === "runtime" ? "layout-flow-native-free" : "layout-stack-model-native-free",
  );
}

function moduleEdges(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const edges: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      assert.ok(ts.isStringLiteral(node.moduleSpecifier));
      edges.push(node.moduleSpecifier.text);
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      assert.ok(ts.isStringLiteral(node.argument.literal));
      edges.push(node.argument.literal.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      assert.ok(argument && ts.isStringLiteral(argument));
      edges.push(argument.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(source.referencedFiles.length, 0, "No external declaration references");
  assert.equal(source.typeReferenceDirectives.length, 0, "No ambient type packages");
  assert.equal(source.libReferenceDirectives.length, 0, "ES libs come only from compiler options");
  return edges;
}

export function emittedClosure(entry: string, allowed: string | readonly string[], declaration: boolean): Set<string> {
  const visited = new Set<string>();
  const pending = [entry];
  while (pending.length) {
    const path = pending.pop();
    assert.ok(path);
    if (visited.has(path)) continue;
    assert.ok(
      path === entry || (typeof allowed === "string" ? path.startsWith(`${allowed}${sep}`) : allowed.includes(path)),
      `Boundary leak: ${path}`,
    );
    visited.add(path);
    for (const edge of moduleEdges(path)) {
      if (edge === "@updf/layout-boxes/arithmetic" && typeof allowed !== "string") {
        const arithmetic = allowed.find((candidate) =>
          candidate.endsWith(`/layout-boxes/src/arithmetic${declaration ? ".d.ts" : ".js"}`),
        );
        assert.ok(arithmetic, `Boundary leak: ${edge}`);
        pending.push(arithmetic);
        continue;
      }
      assert.ok(edge.startsWith("."), `Boundary leak: ${edge}`);
      const target = declaration
        ? ts.resolveModuleName(edge, path, { moduleResolution: ts.ModuleResolutionKind.Bundler }, ts.sys).resolvedModule
            ?.resolvedFileName
        : resolve(dirname(path), edge);
      assert.ok(target, `Unresolved boundary dependency: ${edge}`);
      pending.push(target);
    }
  }
  return visited;
}

export function appendFixture(path: string, text: string): void {
  writeFileSync(path, `${readFileSync(path, "utf8")}\n${text}\n`);
}
