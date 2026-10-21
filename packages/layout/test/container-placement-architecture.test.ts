import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = (name: string) => readFileSync(new URL(`../src/${name}.ts`, import.meta.url), "utf8");
function nodes(text: string): ts.Node[] {
  const result: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile("fixture.ts", text, ts.ScriptTarget.Latest, true));
  return result;
}
function painterContract(text: string): void {
  const tree = nodes(text);
  const identifiers = tree.filter(ts.isIdentifier).map((node) => node.text);
  for (const forbidden of [
    "StackSelection",
    "StackPiece",
    "selection",
    "piece",
    "checkPiece",
    "sum",
    "materializeGeneratedInterval",
    "generatedFragmentStart",
  ])
    assert.ok(!identifiers.includes(forbidden), forbidden);
  for (const node of tree.filter(ts.isImportDeclaration))
    assert.doesNotMatch(node.moduleSpecifier.getText(), /stack|generated-interval/);
  for (const name of ["x", "y", "children"])
    assert.ok(
      tree.some(
        (node) =>
          ts.isPropertyAccessExpression(node) && node.expression.getText() === "context" && node.name.text === name,
      ),
      name,
    );
  assert.ok(tree.some((node) => ts.isForOfStatement(node) && node.expression.getText() === "context.children"));
}
function constructorContract(text: string, name: string): void {
  const fn = nodes(text).find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(fn);
  const tree = nodes(fn.getText());
  const calls = tree
    .filter(ts.isCallExpression)
    .filter((node) => node.expression.getText() === "prepareContainerPlacements");
  assert.equal(calls.length, 1);
  const declaration = tree.find((node) => ts.isVariableDeclaration(node) && node.name.getText() === "fragment");
  assert.ok(declaration);
  assert.ok((calls[0]?.pos ?? Infinity) < declaration.pos);
  const painter = tree.filter(ts.isCallExpression).find((node) => node.expression.getText() === "paintContainerSteps");
  assert.equal(painter?.arguments[3]?.getText(), "context");
  assert.ok(tree.some((node) => ts.isCallExpression(node) && node.expression.getText() === "fragmentGeometry"));
}

test("painter consumes stored placement fields only; both production constructors prepare once", () => {
  painterContract(source("container-paint"));
  constructorContract(source("container-producer"), "painted");
  constructorContract(source("row-producer"), "paintedRow");
});

test("negative controls reject restored selection, generated import, coordinate sum and missing binding", () => {
  const painter = source("container-paint");
  for (const injection of [
    'import type { StackSelection } from "./stack.js";',
    'import { materializeGeneratedInterval } from "./generated-interval.js";',
    "const y = sum([box.inset.top, piece.top]);",
  ])
    assert.throws(() => painterContract(`${injection}\n${painter}`));
  assert.throws(() => painterContract(painter.replace("context.children", "[]")));
  assert.throws(() =>
    constructorContract(
      source("row-producer").replace("prepareContainerPlacements(box", "fakePlacements(box"),
      "paintedRow",
    ),
  );
});

test("one immediate materialization site remains in preparation, not any paint closure", () => {
  const helper = nodes(source("container-placement"));
  const calls = helper
    .filter(ts.isCallExpression)
    .filter((node) => node.expression.getText() === "materializeGeneratedInterval");
  assert.equal(calls.length, 1);
  const starts = helper
    .filter(ts.isCallExpression)
    .filter((node) => node.expression.getText() === "generatedFragmentStart");
  assert.equal(starts.length, 0);
  const authentication = helper
    .filter(ts.isCallExpression)
    .filter((node) => node.expression.getText() === "assertGeneratedPart");
  assert.equal(authentication.length, 1);
});
