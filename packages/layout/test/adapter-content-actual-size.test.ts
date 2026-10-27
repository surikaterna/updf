import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  defineBlockAdapter,
  extension,
  fixed,
  measure,
  type AdapterContentConstraints,
  type BlockContent,
  type MeasureContext,
  type MeasuredContent,
  type BlockAdapterIdentity,
} from "@updf/layout";
import { contentActualSize, measureActualBlockContent } from "../dist/cjs/adapter-content.js";

const block = () => h(Block, { children: null, style: { width: 30, height: 20 } });
function duringMeasure(run: (context: MeasureContext) => void, children: readonly BlockAdapterIdentity[] = []) {
  const adapter = defineBlockAdapter({
    name: "test.actual-size",
    validate: (p) => p,
    measure(_props, context) {
      run(context);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 100, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  return measure(extension(adapter, {}), { width: 100 }, { adapters: createExtensions([adapter, ...children]) });
}
test("actual size belongs only to the final opted-in report and active lifetime; public allocation stays unchanged", () => {
  let retained: MeasuredContent | undefined;
  duringMeasure((context) => {
    const ordinary = context.measureContent(block(), { width: 100 });
    assert.deepEqual(ordinary.size, { width: 100, height: 20 });
    assert.throws(() => contentActualSize(ordinary), DocumentError);
    retained = measureActualBlockContent(context, block(), { width: 100 });
    assert.deepEqual(retained.size, ordinary.size);
    const size = contentActualSize(retained);
    assert.deepEqual(size, { width: 30, height: 20 });
    assert.ok(Object.isFrozen(size));
    assert.equal(contentActualSize(retained), size);
    assert.throws(() => contentActualSize({ ...retained! }), DocumentError);
    assert.throws(() => contentActualSize({ size, nodes: [] }), DocumentError);
  });
  assert.throws(() => contentActualSize(retained!), /closed/);
});
test("actual height uses the selected decorated fragment, with one child measure and preparation query", () => {
  let measures = 0;
  let queries = 0;
  const child = defineBlockAdapter({
    name: "test.actual-decorated-child",
    validate: (p) => p,
    measure(_props, context) {
      measures++;
      assert.equal(context.width, 24);
      const decorations = context.reserveDecorations([
        { edge: "before", repeat: "first", height: 2, content: fixed({ height: 2, children: [] }) },
        { edge: "after", repeat: "last", height: 3, content: fixed({ height: 3, children: [] }) },
      ]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: 24, height: 1 },
        decorations,
        next: () => {
          queries++;
          return { end: 1, height: 4, nodes: [] };
        },
      };
    },
  });
  duringMeasure(
    (context) => {
      const content = h(Block, {
        style: { width: 30, padding: 2, border: { width: 1, color: [0, 0, 0] } },
        children: extension(child, {}),
      });
      const report = measureActualBlockContent(context, content, { width: 100 });
      assert.deepEqual(contentActualSize(report), { width: 30, height: 15 });
      assert.equal(measures, 1);
      assert.equal(queries, 1);
    },
    [child],
  );
});
test("actual requests retain usual validation and require exactly one canonical Block without style wrapper", () => {
  duringMeasure((context) => {
    for (const content of [[], [block(), block()], fixed({ height: 1, children: [] }), { type: "unknown" }])
      assert.throws(() => measureActualBlockContent(context, content as BlockContent, { width: 100 }), DocumentError);
    for (const constraints of [[], { width: 100, style: {} }, { width: 101 }, { width: NaN }, { width: 100, extra: 1 }])
      assert.throws(
        () => measureActualBlockContent(context, block(), constraints as AdapterContentConstraints),
        DocumentError,
      );
    assert.deepEqual(contentActualSize(measureActualBlockContent(context, [block()], { width: 100 })), {
      width: 30,
      height: 20,
    });
  });
});
test("request identity is private, removed on success and exception, and measureContent is invoked once", () => {
  duringMeasure((context) => {
    const constraints = { width: 100 };
    let calls = 0;
    let request: AdapterContentConstraints | undefined;
    const delegated = {
      ...context,
      measureContent: ((content: BlockContent, input: AdapterContentConstraints) => {
        calls++;
        request = input;
        assert.notEqual(input, constraints);
        const nested = context.measureContent(block(), constraints);
        assert.throws(() => contentActualSize(nested), DocumentError);
        const nestedActual = measureActualBlockContent(context, block(), { width: 40 });
        assert.deepEqual(contentActualSize(nestedActual), { width: 30, height: 20 });
        assert.throws(() => contentActualSize(context.measureContent(block(), { width: 40 })), DocumentError);
        return context.measureContent(content, input);
      }) as MeasureContext["measureContent"],
    };
    const measured = measureActualBlockContent(delegated, block(), constraints);
    assert.equal(calls, 1);
    assert.deepEqual(contentActualSize(measured), { width: 30, height: 20 });
    assert.throws(() => contentActualSize(context.measureContent(block(), request!)), DocumentError);
    const original = new Error("test request failure");
    const failing = {
      ...context,
      measureContent: ((_content: BlockContent, input: AdapterContentConstraints) => {
        request = input;
        throw original;
      }) as MeasureContext["measureContent"],
    };
    assert.throws(
      () => measureActualBlockContent(failing, block(), constraints),
      (error) => error === original,
    );
    assert.throws(() => contentActualSize(context.measureContent(block(), request!)), DocumentError);
  });
});
