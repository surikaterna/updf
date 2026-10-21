import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { internalImporters } from "../../../scripts/boundaries.js";

const directory = new URL("../src/", import.meta.url);
test("common descent checks semantic child frames independently of declared parts", () => {
  const source = readFileSync(new URL("fragment-paint-preparation.ts", directory), "utf8");
  const functions = tree(source).filter(ts.isFunctionDeclaration);
  const descend = functions.find((node) => node.name?.text === "descend")!;
  const check = functions.find((node) => node.name?.text === "childReservation")!;
  assert.ok(
    descend.body?.statements.some(
      (node) =>
        ts.isExpressionStatement(node) &&
        ts.isCallExpression(node.expression) &&
        node.expression.expression.getText() === "childReservation",
    ),
  );
  assert.match(check.getText(), /relation\.fragment\.height/);
  assert.doesNotMatch(check.getText(), /geometry|parts|certificate|while\s*\(/);
});
function tree(text: string): ts.Node[] {
  const result: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true));
  return result;
}
function painterContract(text: string): void {
  const nodes = tree(text);
  for (const node of nodes) {
    if (ts.isPropertyAccessExpression(node)) assert.notEqual(node.getText(), "context.start");
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const names = node.importClause.namedBindings.elements.map((entry) => (entry.propertyName ?? entry.name).text);
      for (const forbidden of ["materializeGeneratedInterval", "materializedStart", "generatedFragmentStart"])
        assert.ok(!names.includes(forbidden), forbidden);
    }
  }
  const painters = nodes.filter(
    (node) =>
      (ts.isMethodDeclaration(node) || ts.isPropertyAssignment(node) || ts.isFunctionDeclaration(node)) &&
      node.name &&
      /^(paint|paintSteps|paintLines|regions|paintContainerSteps)$/.test(node.name.getText()),
  );
  for (const painter of painters) {
    const identifiers = tree(painter.getText())
      .filter(ts.isIdentifier)
      .map((node) => node.text);
    for (const forbidden of [
      "MetricSum",
      "sum",
      "derivedAxis",
      "fragmentGeometry",
      "wholeBoxGeometry",
      "prepareFragmentPaint",
    ])
      assert.ok(!identifiers.includes(forbidden), forbidden);
  }
}

test("normal painters consume declarations, never materialize or derive executable geometry", () => {
  for (const name of [
    "blocks.ts",
    "container-paint.ts",
    "container-producer.ts",
    "content-producer.ts",
    "decorated-producer.ts",
    "measured-source.ts",
    "natural-paint.ts",
    "paragraph-producer.ts",
    "row-producer.ts",
    "shared-edge-producer.ts",
    "protocol-runtime.ts",
  ]) {
    const text = readFileSync(new URL(name, directory), "utf8");
    painterContract(text);
  }
});

test("architecture controls catch aliased materialization, late starts and painter-side geometry", () => {
  for (const text of [
    'import {materializeGeneratedInterval as hidden} from "./generated-interval.js";',
    "const x = context.start(0, 1);",
    "const fragment = {paint(context) { return sum([context.y, 1]); }};",
    "const fragment = {paint(context) { return wholeBoxGeometry(1); }};",
  ])
    assert.throws(() => painterContract(text));
});

test("private ABI negative compile controls reject missing declarations and restored callback starts", () => {
  const filename = fileURLToPath(new URL("./private-paint-negative.ts", import.meta.url));
  const source = `import type {PlacedFragment, FragmentPaintContext} from "../src/protocol.js";
    const legacy: PlacedFragment = {height: 1, nextOffset: 1, paint: () => []};
    function late(context: FragmentPaintContext) { return context.start(0, 1); }
    const fallback: FragmentPaintContext = {x: 0, y: 0, budget: null!, start: () => 0};
    export {legacy, late, fallback};`;
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version, onError, fresh) =>
    name === filename
      ? ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)
      : original(name, version, onError, fresh);
  const program = ts.createProgram([filename], options, host);
  const diagnostics = program.getSemanticDiagnostics().filter((entry) => entry.file?.fileName === filename);
  assert.deepEqual(diagnostics.map((entry) => entry.code).sort(), [2339, 2353, 2741]);
  assert.match(
    ts.flattenDiagnosticMessageText(diagnostics.find((entry) => entry.code === 2741)!.messageText, " "),
    /geometry/,
  );
});

test("layout core/internal permission inventory equals actual source imports, including type imports", () => {
  const actual: string[] = [];
  for (const name of readdirSync(directory).filter((name) => name.endsWith(".ts"))) {
    const text = readFileSync(new URL(name, directory), "utf8");
    if (
      tree(text).some(
        (node) =>
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier !== undefined &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text === "@updf/core/internal",
      )
    )
      actual.push(`layout/src/${name}`);
  }
  const allowed = internalImporters["@updf/core/internal"]!.filter((name) => name.startsWith("layout/"));
  assert.deepEqual(actual.sort(), [...allowed].sort());
});
