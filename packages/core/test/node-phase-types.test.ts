import assert from "node:assert/strict";
import test from "node:test";
import type {
  InkPhase,
  MeasurementContext,
  MeasurementPhase,
  PaintPhase,
  CollectionPhase,
  NodeOf,
} from "../src/nodes/context.js";
import { measurement } from "../src/nodes/wiring.js";

function coverage(measure: MeasurementPhase, paint: PaintPhase, ink: InkPhase, collect: CollectionPhase) {
  const { xObject: _measure, ...missingMeasure } = measure;
  const { richText: _paint, ...missingPaint } = paint;
  const { line: _ink, ...missingInk } = ink;
  const { paintGroup: _collect, ...missingCollect } = collect;
  // @ts-expect-error Each phase must explicitly cover the whole public node union.
  const incompleteMeasure: MeasurementPhase = missingMeasure;
  // @ts-expect-error Painting cannot silently omit rich text.
  const incompletePaint: PaintPhase = missingPaint;
  // @ts-expect-error Ink cannot silently omit a geometry kind.
  const incompleteInk: InkPhase = missingInk;
  // @ts-expect-error Nonapplicable groups must still be explicitly null in collection.
  const incompleteCollect: CollectionPhase = missingCollect;
  return [incompleteMeasure, incompletePaint, incompleteInk, incompleteCollect];
}

function wrongKind(rectangle: NodeOf<"rect">, context: MeasurementContext) {
  // @ts-expect-error A selected line handler cannot accept a rectangle.
  return measurement("line")(rectangle, context);
}

test("phase coverage and discriminator constraints are compiled, not runtime policies", () => {
  assert.equal(typeof coverage, "function");
  assert.equal(typeof wrongKind, "function");
});
