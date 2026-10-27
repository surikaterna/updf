import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { ownContentData, semanticComponent } from "@updf/core/internal";
import { createOwnedResource } from "@updf/core/resources";
import { h } from "@updf/core/vdom";
import { ledger } from "../dist/cjs/measurement/ledger.js";
import { policy } from "../dist/cjs/core/policy.js";
import { normalizeScoped } from "../dist/cjs/vdom/normalize.js";
import { operationState } from "../dist/cjs/vdom/operation-state.js";
import { preparationControls } from "../dist/cjs/vdom/preparation.js";
import { emptyTextResources } from "../dist/cjs/core/text-resources.js";

test("capture copies each data occurrence and charges opaque terminals and Unicode before shortcuts", () => {
  const state = operationState(emptyTextResources, ledger(policy()));
  const controls = preparationControls(state);
  const identity = {};
  const resource = createOwnedResource({ kind: "test" });
  const content = ownContentData(Object.freeze({ owned: true }));
  const vnode = h(semanticComponent({}), {}, "owned-key");
  const shared = { text: "😀" };
  const raw = { resource, content, vnode, a: shared, b: shared };
  const nodes = normalizeScoped([raw, raw], state, (value) => ({ identity, props: value as typeof raw }), "/root");
  assert.equal(state.sourceNodes, 19); // Three walk nodes plus eight snapshot occurrences per recipe.
  assert.equal(state.budget.chars, 4);
  assert.equal(state.budget.units, 19);
  const first = nodes[0]!,
    second = nodes[1]!;
  assert.notEqual(first.path, second.path);
  assert.notEqual(first.scope, second.scope);
  assert.notEqual(first.value, second.value);
  assert.ok(typeof first.value !== "string" && typeof second.value !== "string");
  assert.equal(first.value.identity, identity);
  assert.notEqual(first.value.props, raw);
  assert.notEqual(first.value.props, second.value.props);
  assert.notEqual(first.value.props.a, first.value.props.b);
  assert.equal(first.value.props.resource, resource);
  assert.equal(first.value.props.content, content);
  assert.equal(first.value.props.vnode, vnode);
  shared.text = "changed";
  controls.suspend();
  controls.seal(nodes);
  assert.deepEqual(first.value.props.a, { text: "😀" });
  assert.ok(Object.isFrozen(first.value.props.a));
  assert.equal(Object.isFrozen(raw), false);
  controls.close();
});

test("capture counts repeated protected resources cumulatively, without charging ordinary normalization", () => {
  const resource = createOwnedResource({ kind: "test" });
  const raw = { resource, again: resource };
  const data = (props: object) => ({ identity: {}, props: props as typeof raw });
  const ordinary = operationState(emptyTextResources, ledger(policy({ limits: { nodes: 1 } })));
  normalizeScoped(raw, ordinary, data, "/root");
  assert.equal(ordinary.sourceNodes, 1);
  const state = operationState(emptyTextResources, ledger(policy({ limits: { nodes: 3 } })));
  const controls = preparationControls(state);
  assert.throws(
    () => normalizeScoped(raw, state, data, "/root"),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]!.path === "/root/again",
  );
  assert.equal(state.budget.units, 4);
  assert.equal(Object.isFrozen(raw), false);
  controls.close();
});
