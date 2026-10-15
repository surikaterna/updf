import assert from "node:assert/strict";
import test from "node:test";
import { derivedAxis, materializedStart } from "@updf/layout-boxes/geometry";
import { createExtensions, document, flow } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock } from "@updf/svg/layout";
import { layout } from "../../../tests/fixtures/text-options.js";

const prepared = prepareSVG('<svg viewBox="0 0 1 1"><rect width="1" height="1"/></svg>');
const extensions = createExtensions(svgAdapters);

test("SVG strict available-height deferrals remain distinct from native-certifiable decimal placements", () => {
  for (const [heights, height] of [
    [[4.9, 0.1], 5],
    [[1.2, 1.1], 2.3],
  ] as const) {
    const axis = derivedAxis(0, height, "/axis");
    assert.equal(materializedStart(axis, heights[0], heights[1], "/second"), heights[0]);
    const result = layout(
      document({
        children: flow({
          pageSize: { width: 100, height },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          extensions,
          children: heights.map((extent) => svgBlock(prepared, { width: 1, height: extent })),
        }),
      }),
    );
    assert.equal(result.pageCount, 2);
    assert.deepEqual(
      result.placements.map((p) => [p.pageIndex, p.box.y, p.box.height]),
      [
        [0, 0, heights[0]],
        [1, 0, heights[1]],
      ],
    );
  }
});

test("metric decimal fits do not imply an origin-zero native certificate or translation invariance", () => {
  for (const [offset, extent, height] of [
    [0.1, 0.2, 0.3],
    [20.6, 10.3, 30.9],
  ]) {
    assert.throws(() => materializedStart(derivedAxis(0, height!, "/axis"), offset!, extent!, "/part"));
  }
  const translated = derivedAxis(700, 730.9, "/axis");
  assert.equal(materializedStart(translated, 20.6, 10.3, "/part"), 720.6);
});
