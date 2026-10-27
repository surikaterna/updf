import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { policy } from "@updf/core/internal";
import { block, createExtensions, defineBlockAdapter, extension, measure, fixed } from "@updf/layout";
import { fragmentGeometry, wholeBoxGeometry } from "../dist/cjs/fragment-paint-preparation.js";
import { paintNatural, prepareNatural } from "../dist/cjs/natural-paint.js";
import type { PreparedBlock } from "../dist/cjs/protocol.js";

function rejects(call: () => unknown, code: string) {
  assert.throws(call, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function fixture(hint: number, actual: number) {
  const adapter = defineBlockAdapter({
    name: "natural.actual",
    validate: () => ({}),
    measure: () => ({
      naturalSize: { width: 1, height: hint },
      fragmentation: "atomic",
      extent: 1,
      next: () => ({ end: 1, height: actual, nodes: [] }),
    }),
  });
  return { adapter, content: extension(adapter, {}), extensions: createExtensions([adapter]) };
}

test("natural measurement uses complete actual heights above and below the natural hint", () => {
  for (const [hint, actual] of [
    [0, 2],
    [10, 1],
    [0, 0],
  ] as const) {
    const { content, extensions } = fixture(hint, actual);
    const result = measure(content, { width: 10, height: actual }, { adapters: extensions });
    assert.equal(result.size.height, actual);
    assert.ok(Object.isFrozen(result));
    if (actual)
      rejects(() => measure(content, { width: 10, height: actual / 2 }, { adapters: extensions }), "VERTICAL_OVERFLOW");
    assert.equal(measure(block({ children: [content] }), { width: 10 }, { adapters: extensions }).size.height, actual);
  }
});

test("adapter content measurement shares actual sizes, ceilings, and handle closure", () => {
  const inner = fixture(10, 1);
  let retained: (() => unknown) | undefined;
  const outer = defineBlockAdapter({
    name: "natural.owner",
    validate: () => ({}),
    measure(_props, context) {
      retained = () => context.measureContent(inner.content, { width: 10 });
      const result = context.measureContent(inner.content, { width: 10, height: 1 });
      assert.equal(result.size.height, 1);
      rejects(() => context.measureContent(inner.content, { width: 10, height: 0 }), "VERTICAL_OVERFLOW");
      return {
        naturalSize: result.size,
        fragmentation: "atomic",
        extent: 1,
        next: () => ({ end: 1, height: result.size.height, nodes: result.nodes }),
      };
    },
  });
  const extensions = createExtensions([inner.adapter, outer]);
  assert.equal(measure(extension(outer, {}), { width: 10 }, { adapters: extensions }).size.height, 1);
  rejects(() => retained!(), "MEASUREMENT_CONTEXT");
});

function prepared(height: number, paint: () => [] = () => []): PreparedBlock {
  return {
    naturalSize: { width: 10, height: 0 },
    fragmentation: "atomic",
    extent: 1,
    fragment(request) {
      assert.equal(request.mode, "complete");
      for (const key of ["availableHeight", "freshHeight", "usedHeight", "atFreshRegion"])
        assert.equal(Object.hasOwn(request, key), false);
      request.budget?.generated(1, 0, 0, 1, "/unit");
      return { nextOffset: 1, height, geometry: wholeBoxGeometry(height), paint };
    },
  };
}

test("whole measurement selection and geometry finish before any painting", () => {
  let paints = 0;
  const first = prepared(1, () => {
    paints++;
    return [];
  });
  const invalid: PreparedBlock = {
    ...prepared(1),
    fragment: () => ({
      nextOffset: 1,
      height: 1,
      geometry: fragmentGeometry([{ offset: NaN, height: 1, reservation: "whole-box" }]),
      paint: () => [],
    }),
  };
  rejects(() => prepareNatural([first, invalid], 10, policy(), "/natural"), "GEOMETRY");
  assert.equal(paints, 0);
  const result = prepareNatural([first, first], 10, policy(), "/natural");
  assert.equal(paints, 0);
  assert.equal(result.height, 2);
  paintNatural(result.roots);
  assert.equal(paints, 2);
});

test("complete natural selection retains cumulative output budgets and finite aggregate height", () => {
  rejects(() => prepareNatural([prepared(1), prepared(1)], 10, { ...policy(), nodes: 1 }, "/natural"), "LIMIT");
  rejects(
    () => prepareNatural([prepared(Number.MAX_VALUE), prepared(Number.MAX_VALUE)], 10, policy(), "/natural"),
    "GEOMETRY",
  );
});

test("empty content, authored height, clipping and page controls retain their policies", () => {
  assert.equal(measure([], { width: 10, height: 0 }).size.height, 0);
  const child = fixed({ height: 4, children: [] });
  assert.equal(
    measure(block({ style: { height: 2, overflow: "hidden" }, children: [child] }), { width: 10 }).size.height,
    2,
  );
  rejects(() => measure(block({ style: { height: 2 }, children: [child] }), { width: 10 }), "VERTICAL_OVERFLOW");
  rejects(() => measure([{ type: "pageBreak" }], { width: 10 }), "VDOM_HIERARCHY");
});
