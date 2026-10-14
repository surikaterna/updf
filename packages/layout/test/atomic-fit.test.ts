import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { block, createExtensions, defineBlockAdapter, document, extension, flow, layout } from "@updf/layout";

test("shared adapter requests certify fractional capacity without changing width, height or progress", () => {
  const calls: { width: number; available: number; height: number }[] = [];
  const adapter = defineBlockAdapter<{ height: number }>({
    name: "fractional.fixed",
    validate: (p) => p as { height: number },
    measure: ({ height }) => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 1, height },
      fragment(request) {
        assert.ok(Object.isFrozen(request));
        assert.deepEqual(Object.keys(request).sort(), [
          "atFreshRegion",
          "availableHeight",
          "freshHeight",
          "offset",
          "width",
        ]);
        calls.push({ width: request.width, available: request.availableHeight, height });
        return height > request.availableHeight
          ? { status: "defer" }
          : {
              status: "placed",
              nextOffset: 1,
              height,
              nodes: [{ type: "rect", x: 0, y: 0, width: 1, height, paint: { fill: [0, 0, 0], stroke: null } }],
            };
      },
    }),
  });
  const children = [4.9, 0.1].map((height) => extension(adapter, { height }));
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 5 },
        margins: { top: 0, left: 0, right: 0, bottom: 0 },
        extensions: createExtensions([adapter]),
        children: block({ children }),
      }),
    }),
  );
  assert.equal(result.pageCount, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.available, 0.1);
  assert.equal(calls[1]?.height, 0.1);
  assert.equal(calls[1]?.width, 100);
  assert.ok(render(result.document).length > 0);
  assert.throws(() => render(result.document, { limits: { outputBytes: 1 } }), DocumentError);
});

test("an atomic placed reply that cannot pass native placement is deferred before its nodes are copied", () => {
  const heights: number[] = [];
  const adapter = defineBlockAdapter<{ height: number }>({
    name: "fractional.always-place",
    validate: (p) => p as { height: number },
    measure: ({ height }) => ({
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width: 1, height },
      fragment() {
        heights.push(height);
        return { status: "placed", nextOffset: 1, height, nodes: [] };
      },
    }),
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 100, height: 0.3 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions: createExtensions([adapter]),
        children: [0.1, 0.2].map((height) => extension(adapter, { height })),
      }),
    }),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(heights, [0.1, 0.2, 0.2]);
});
