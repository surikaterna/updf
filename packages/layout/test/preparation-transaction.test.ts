import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { semanticComponent, snapshotData, type SemanticRecipe } from "@updf/core/internal";
import { createPreparingDrawingOperation } from "@updf/core/internal-preparation";
import { h } from "@updf/core/vdom";
import { definePreparationResource } from "@updf/layout/internal-preparation";
import {
  captureVisualOccurrence,
  bindVisualCapture,
  consumeOccurrenceReplacements,
  replaceParticipationData,
  replaceVisualResource,
  closeVisualCapture,
} from "../dist/cjs/visual-preparation.js";
import { owned } from "./preparation-fixture.js";

function occurrence() {
  const stage = createPreparingDrawingOperation({});
  const identity = Object.freeze({});
  const node = stage.operation.normalizeContent(
    h(semanticComponent(identity, true), {}),
    () => assert.fail(),
    "/owned",
  )[0]!;
  const source = snapshotData(
    { props: { children: null, style: { width: 20, height: 20 } }, data: { untouched: 1 } },
    "/source",
  );
  const owner = { identity, capture: () => source, replace: () => source };
  const visual = captureVisualOccurrence(owner, node.value as SemanticRecipe, source);
  const data = captureVisualOccurrence(owner, node.value as SemanticRecipe, source, "participation-data", visual);
  const resource = owned();
  bindVisualCapture(visual, resource, "Prepared0", stage.operation);
  bindVisualCapture(data, resource, "Prepared0", stage.operation);
  const results = [
    { capture: visual, token: replaceVisualResource(visual, resource, "Prepared0") },
    { capture: data, token: replaceParticipationData(data, resource, "Prepared0", { prepared: true }) },
  ];
  return { stage, node, results, visual, data, resource };
}

test("transaction validates every token before consumption and rejects incomplete, foreign, copied and replayed results", () => {
  const a = occurrence(),
    b = occurrence();
  const consume = (results = a.results, operation = a.stage.operation) =>
    consumeOccurrenceReplacements(results, a.node, operation);
  assert.throws(() => consume([]), DocumentError);
  assert.throws(() => consume([a.results[0]!]), DocumentError);
  assert.throws(() => consume([a.results[0]!, a.results[0]!]), DocumentError);
  assert.throws(() => consume([a.results[0]!, b.results[1]!]), DocumentError);
  assert.throws(() => consume([{ ...a.results[0]!, token: { ...a.results[0]!.token } }, a.results[1]!]), DocumentError);
  assert.throws(() => consume(a.results, b.stage.operation), DocumentError);
  assert.equal(consume(), a.node.value);
  assert.throws(() => consume(), DocumentError);
  closeVisualCapture(b.visual);
  assert.throws(() => consumeOccurrenceReplacements(b.results, b.node, b.stage.operation), DocumentError);
  a.stage.controls.close();
  b.stage.controls.close();
});

test("explicit slots authenticate definition owners instead of accepting unknown or copied handles", () => {
  const descriptor = {
    identity: {},
    capture: () => undefined,
    resolve: async () => owned(),
    replace: () => assert.fail(),
  };
  for (const slot of ["participation-data", "visual-resource"] as const)
    assert.throws(() => definePreparationResource({ ...descriptor, slot }), DocumentError);
});
