import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Block, createExtensions, defineBlockAdapter, extension, measure, type MeasureContext } from "@updf/layout";
import { visualContentHeight } from "@updf/layout/internal-visual";

test("private definite content height uses Block clamping/axis ownership and cache identity", () => {
  const heights: number[] = [];
  let retained: MeasureContext | undefined;
  const adapter = defineBlockAdapter({
    name: "test.definite-height",
    validate: (p) => p,
    measure(_props, context) {
      retained = context;
      const height = visualContentHeight(context);
      heights.push(height);
      assert.throws(() => visualContentHeight({ ...context }), /definite Block/u);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  const child = extension(adapter, {});
  const content = [
    h(Block, { style: { height: 50, maxHeight: 30, paddingTop: 3, paddingBottom: 7 }, children: child }),
    h(Block, { style: { height: 10, minHeight: 40, paddingTop: 3, paddingBottom: 7 }, children: child }),
    h(Block, { style: { height: 80, paddingTop: 0.1, paddingBottom: 16.5 }, children: child }),
    h(Block, { style: { height: 80, paddingTop: 0.2, paddingBottom: 16.4 }, children: child }),
  ];
  const options = { adapters: createExtensions([adapter]) };
  assert.equal(measure(content.slice(0, 2), { width: 100 }, options).size.height, 70);
  assert.throws(() => measure(content.slice(2), { width: 100 }, options), /reserved content region/u);
  // The last two Blocks have equal native capacity (63.4), but unequal metric dimensions.
  assert.deepEqual(heights, [20, 30, 63.4, 63.400000000000006]);
  assert.throws(() => visualContentHeight(retained!), /active definite/u);
  assert.throws(() => measure(child, { width: 100 }, { adapters: createExtensions([adapter]) }), /definite Block/u);
});

test("private metric channel preserves zero-content Blocks and rejects erased reservations before child work", () => {
  const heights: number[] = [];
  const adapter = defineBlockAdapter({
    name: "test.empty-height",
    validate: (p) => p,
    measure(_props, context) {
      heights.push(visualContentHeight(context));
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 0 },
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  const child = extension(adapter, {});
  const options = { adapters: createExtensions([adapter]) };
  const block = (height: number) => h(Block, { style: { height, paddingTop: 1 }, children: child });
  assert.deepEqual(measure(block(1), { width: 100 }, options).size, { width: 100, height: 1 });
  assert.deepEqual(heights, [0]);
  assert.throws(() => measure(block(0.9), { width: 100 }, options), /erase padding/u);
  assert.deepEqual(heights, [0]);
  assert.deepEqual(measure(h(Block, { style: { height: 0 }, children: [] }), { width: 100 }).size, {
    width: 100,
    height: 0,
  });
});
