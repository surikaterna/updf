import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
function parse(text: string) {
  return ts.createSourceFile("paragraph.ts", text, ts.ScriptTarget.Latest, true);
}
function nodes(root: ts.Node): ts.Node[] {
  const result: ts.Node[] = [];
  function visit(node: ts.Node) {
    result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(root);
  return result;
}
function assertSelectionOnly(text: string): void {
  const ast = parse(text);
  const all = nodes(ast);
  const localFit = all.filter(
    (node) =>
      ts.isCallExpression(node) && /^(exceeds|canFit|selectRange|selectRows)$/.test(node.expression.getText(ast)),
  );
  assert.equal(localFit.length, 0, "paragraph emitters must not own fit decisions");
  const capacityBranches = all.filter(
    (node) =>
      (ts.isIfStatement(node) || ts.isWhileStatement(node)) &&
      node.expression &&
      /\b(freshHeight|availableHeight|usedHeight)\b/.test(node.expression.getText(ast)),
  );
  assert.equal(capacityBranches.length, 0, "capacity cannot control emission");
  const imports = all.filter(ts.isImportDeclaration).map((node) => node.moduleSpecifier.getText(ast));
  assert.ok(imports.includes('"./paragraph-fragments.js"'));
  assert.ok(!imports.some((name) => /measured-source/.test(name)));
  assert.equal(
    all.filter((node) => ts.isCallExpression(node) && node.expression.getText(ast) === "selectParagraph").length,
    1,
  );
}
test("actual raw/rich source ASTs bind the canonical operation and contain no private capacity selection", () => {
  for (const name of ["paragraph-producer", "content-producer"]) assertSelectionOnly(source(name));
  const binding = parse(source("paragraph-fragments"));
  const calls = nodes(binding).filter(ts.isCallExpression);
  assert.equal(calls.filter((node) => node.expression.getText(binding) === "createRangeOperation").length, 1);
  assert.ok(calls.some((node) => node.expression.getText(binding) === "fragments.operation.select"));
  assert.ok(!/MAX_SAFE_INTEGER|Object\.fromEntries/.test(binding.text));
  const next = nodes(binding).find((node) => ts.isPropertyAssignment(node) && node.name.getText(binding) === "next");
  assert.ok(next && ts.isPropertyAssignment(next) && ts.isArrowFunction(next.initializer));
  assert.ok(!/\b(freshHeight|availableHeight|usedHeight|paint|paintLine|consumedHeight)\b/.test(next.getText(binding)));
  const requestReads = nodes(next)
    .filter(ts.isPropertyAccessExpression)
    .filter((node) => node.expression.getText(binding) === "request")
    .map((node) => node.name.text);
  assert.ok(requestReads.every((key) => ["offset", "extent", "width"].includes(key)));
  const blocks = parse(source("blocks"));
  const producers = nodes(blocks)
    .filter(ts.isCallExpression)
    .filter((node) => ["contentProducer", "paragraphProducer"].includes(node.expression.getText(blocks)));
  assert.equal(producers.length, 2);
  for (const call of producers) assert.equal(call.arguments.at(-1)!.getText(blocks), "paragraphFragments(lifetime)");
});
test("architecture negative control rejects the actual dirty-entry raw selector, not legitimate MetricSum emission", () => {
  const current = source("paragraph-producer");
  assertSelectionOnly(current);
  const localLoop = current.replace(
    "for (let index = request.offset; index < end; index++) {",
    "while (end < measurement.lines.length) { if (exceeds(sum([request.usedHeight, height.value, line.height]), request.freshHeight)) break;",
  );
  assert.throws(() => assertSelectionOnly(localLoop), /fit decisions/);
  assert.throws(
    () =>
      assertSelectionOnly(
        current.replace("if (!selected?.units.length)", "if (request.usedHeight > request.freshHeight)"),
      ),
    /capacity/,
  );
});
