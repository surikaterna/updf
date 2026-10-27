import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { semanticComponent } from "@updf/core/internal";
import { h } from "@updf/core/vdom";
import { ledger } from "../dist/cjs/measurement/ledger.js";
import { policy } from "../dist/cjs/core/policy.js";
import { contentChildren, normalizeScoped } from "../dist/cjs/vdom/normalize.js";
import { operationState } from "../dist/cjs/vdom/operation-state.js";
import { preparationControls } from "../dist/cjs/vdom/preparation.js";
import { emptyTextResources } from "../dist/cjs/core/text-resources.js";
import type { NormalizedContent } from "../dist/cjs/vdom/normalize.js";

const state = () => operationState(emptyTextResources, ledger(policy()));
const noData = (): never => {
  throw new Error("Unexpected data recipe");
};
function normalSources(input: unknown): number {
  const baseline = state();
  const normal = normalizeScoped(input, baseline, noData, "/root");
  normalizeScoped(contentChildren(normal[0]!), baseline, noData, "/root/children");
  return baseline.sourceNodes;
}
const paths = (children: readonly NormalizedContent[]) =>
  children.flatMap((node) => [node.path, ...node.children.map((child) => child.path)]);

test("captured reads validate cumulatively without new source charges and reject foreign ownership", () => {
  const identity = {};
  const Parent = semanticComponent<{ children?: unknown }>(identity, true);
  const Child = semanticComponent<{ children?: unknown }>({});
  let calls = 0;
  const occurrence = h(
    () => {
      calls++;
      return h(Child, { children: "value" }, "semantic-key");
    },
    {},
    "same-key",
  );
  const operation = state();
  const input = h(Parent, { children: [occurrence, occurrence] });
  const baselineSources = normalSources(input);
  assert.equal(calls, 2);
  calls = 0;
  const controls = preparationControls(operation);
  const roots = normalizeScoped(input, operation, noData, "/root");
  const root = roots[0]!;
  const children = normalizeScoped(contentChildren(root), operation, noData, "/root/children");
  controls.capture(root, children);
  assert.equal(calls, 2);
  assert.notEqual(children[0]!.path, children[1]!.path);
  assert.notEqual(children[0]!.scope, children[1]!.scope);
  assert.equal(children[0]!.key, "semantic-key");
  assert.equal(operation.sourceNodes, baselineSources);
  const sources = operation.sourceNodes;
  const units = operation.budget.units;
  controls.suspend();
  controls.seal(roots);
  const validations: string[] = [];
  controls.layout(() => {
    const consumed = normalizeScoped(contentChildren(root), operation, noData, "/root/children", (_value, path) => {
      validations.push(path);
    });
    assert.equal(consumed, children);
    assert.equal(operation.sourceNodes, sources);
    assert.ok(operation.budget.units > units);
    assert.deepEqual(validations, paths(children));
    assert.equal(calls, 2);
    assert.ok(Object.isFrozen(consumed));
    assert.throws(() => normalizeScoped(contentChildren(root), state(), noData, "/foreign"), DocumentError);
  });
  assert.equal(operation.closed, true);
  assert.throws(() => controls.seal(roots), DocumentError);
  assert.throws(() => normalizeScoped(contentChildren(root), operation, noData, "/closed"), DocumentError);
});

test("normalizer does not read inherited children or execute inherited getters", () => {
  const Child = semanticComponent({});
  const node = h(Child, {});
  let getters = 0;
  Object.defineProperty(Object.prototype, "children", {
    configurable: true,
    get() {
      getters++;
      return "bad";
    },
  });
  try {
    assert.equal(normalizeScoped(node, state(), noData, "/root")[0]!.children.length, 0);
  } finally {
    Reflect.deleteProperty(Object.prototype, "children");
  }
  assert.equal(getters, 0);
});
