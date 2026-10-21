import assert from "node:assert/strict";
import test from "node:test";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { block, column, document, flow, row } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { svgBlock } from "@updf/svg/layout";
import { layout, measure } from "../../../tests/fixtures/text-options.js";

const graphic = prepareSVG('<svg viewBox="0 0 1 1" preserveAspectRatio="none"><rect width="1" height="1"/></svg>');
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
test("direct SVG fixed admission preserves fractional native endpoints without false deferral", () => {
  for (const [heights, height, top, pages] of [
    [[4.9, 0.1], 5, 0, 1],
    [[1.2, 1.1], 2.3, 0, 1],
    [[0.1, 0.2], 0.3, 0, 2],
    [[10.3, 10.3, 10.3], 30.9, 0, 2],
    [[0.1, 0.2], 0.3, 10, 1],
    [[10.3, 10.3, 10.3], 30.9, 700, 1],
  ] as const) {
    const children = heights.map((height) => svgBlock(graphic, { width: 7, height }));
    const result = layout(
      document({
        children: flow({
          pageSize: { width: 20, height: top + height },
          margins: { ...margins, top },
          children,
        }),
      }),
    );
    assert.equal(result.pageCount, pages);
    assert.deepEqual(
      result.placements.map((p) => p.box.height),
      heights,
    );
    assert.deepEqual(
      result.placements.map((p) => p.box.width),
      heights.map(() => 7),
    );
    for (let page = 0; page < pages; page++) {
      let bottom = top;
      for (const { box } of result.placements.filter((p) => p.pageIndex === page)) {
        assert.ok(box.y >= bottom);
        assert.ok(box.y + box.height <= top + height);
        bottom = box.y + box.height;
      }
    }
    assertNativeBounds(result, top, height);
  }
});

function assertNativeBounds(result: ReturnType<typeof layout>, top: number, height: number) {
  const operation = createDrawingLayoutOperation({});
  try {
    for (const page of result.document.pages) {
      const ink = operation.nativeInk(page.children);
      assert.equal(ink.empty, false);
      assert.equal(ink.left, 0);
      assert.equal(ink.right, 7);
      assert.equal(ink.top, top);
      assert.ok(ink.bottom <= top + height);
    }
  } finally {
    operation.close();
  }
}

test("comfortably fitting nested SVG Blocks Rows and Columns retain size and legitimate capacity defer", () => {
  const visual = () => svgBlock(graphic, { width: 7, height: 4 });
  const wrapped = block({
    keepTogether: true,
    style: { padding: 1 },
    children: [
      row({ children: [column({ width: 10, children: [visual()] }), column({ width: 10, children: [visual()] })] }),
      visual(),
    ],
  });
  assert.deepEqual(measure(wrapped, { width: 30 }).size, { width: 30, height: 10 });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 30, height: 15 },
        margins,
        children: [svgBlock(graphic, { width: 7, height: 8 }), wrapped],
      }),
    }),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [8, 10],
  );
  assert.deepEqual(
    result.placements.map((p) => p.box.y),
    [0, 0],
  );
});
