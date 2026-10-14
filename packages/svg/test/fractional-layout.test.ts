import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@updf/core";
import { block, column, createDecorationPlan, createExtensions, document, flow, layout, row } from "@updf/layout";
import { prepareSVG } from "../src/index.js";
import { svgAdapters, svgBlock } from "../src/layout.js";

const graphic = prepareSVG('<svg width="1" height="1"><rect width="1" height="1" fill="red"/></svg>');
const extensions = createExtensions(svgAdapters);

function run(heights: readonly number[], height: number, depth = 0, top = 0, scale = 1) {
  let body: readonly (ReturnType<typeof svgBlock> | ReturnType<typeof block>)[] = heights.map((value) =>
    svgBlock(graphic, { width: scale, height: value * scale }),
  );
  for (let i = 0; i < depth; i++) body = [block({ children: body })];
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 100 * scale, height: top + height * scale },
        margins: { top, right: 0, bottom: 0, left: 0 },
        extensions,
        children: body,
      }),
    }),
  );
  const bytes = render(result.document);
  assert.ok(bytes.length > 0);
  return result;
}

test("certifiable fractional SVG fits remain one page without shrinking direct or nested targets", () => {
  for (const scale of [2 ** -20, 1, 2 ** 20])
    for (const depth of [0, 1, 3]) {
      assert.equal(run([4.9, 0.1], 5, depth, 0, scale).pageCount, 1);
      assert.equal(run([1.2, 1.1], 2.3, depth, 0, scale).pageCount, 1);
    }
  const result = run([4.9, 0.1], 5);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [4.9, 0.1],
  );
  assert.deepEqual(
    result.placements.map((p) => p.box.y),
    [0, 4.9],
  );
});

test("metric-only fits and meaningful overflows defer before native painting instead of weakening certificates", () => {
  for (const depth of [0, 1, 3]) {
    assert.equal(run([0.1, 0.2], 0.3, depth).pageCount, 2);
    assert.equal(run([10.3, 10.3, 10.3], 30.9, depth).pageCount, 2);
    assert.equal(run([0.1, 0.2, 0.3], 0.6, depth).pageCount, 2);
    assert.equal(run([4.9, 0.1001], 5, depth).pageCount, 2);
  }
  assert.equal(run([10.3, 10.3, 10.3], 30.9, 0, 700).pageCount, 1);
  assert.equal(run([10.3, 10.3, 10.3], 30.9, 2, 700).pageCount, 1);
});

test("compensated cursor corrections do not create overlapping atomic placements or late paint failures", () => {
  for (const depth of [0, 1, 3]) {
    const result = run([0.1, 0.2, 0.3, 0.4], 1, depth);
    assert.ok(result.pageCount >= 1 && result.pageCount <= 2);
    for (let i = 1; i < result.placements.length; i++) {
      const previous = result.placements[i - 1]!,
        current = result.placements[i]!;
      if (previous.pageIndex === current.pageIndex) assert.ok(current.box.y >= previous.box.y + previous.box.height);
    }
  }
});

test("closed and explicitly clipped SVG containers retain their declared sizing contracts", () => {
  const picture = svgBlock(graphic, { width: 1, height: 40 });
  const build = (hidden: boolean) =>
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 20 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          extensions,
          children: block({ style: { height: 10, overflow: hidden ? "hidden" : "error" }, children: [picture] }),
        }),
      }),
    );
  assert.throws(() => build(false));
  const clipped = build(true);
  assert.equal(clipped.pageCount, 1);
  assert.ok(render(clipped.document).length > 0);
});

test("Row/Column placement carries the same SVG native constraints without changing prepared sizes", () => {
  const make = (heights: readonly number[], height: number) =>
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height },
          margins: { top: 0, left: 0, right: 0, bottom: 0 },
          extensions,
          children: row({
            children: [
              column({ width: 100, children: heights.map((h) => svgBlock(graphic, { width: 1, height: h })) }),
            ],
          }),
        }),
      }),
    );
  const result = make([4.9, 0.1], 5);
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 0);
  assert.throws(() => make([0.1, 0.2], 0.3));
});

test("fractional decoration subtraction uses its actual operands while native footer bounds remain exact", () => {
  const page = (before: number, body: number, after: number, height: number) =>
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height },
          margins: { top: 0, left: 0, right: 0, bottom: 0 },
          extensions,
          children: block({
            keepTogether: true,
            children: [svgBlock(graphic, { width: 1, height: body })],
            decorations: createDecorationPlan([
              { edge: "before", repeat: "all", height: before, nodes: [] },
              ...(after ? [{ edge: "after" as const, repeat: "all" as const, height: after, nodes: [] }] : []),
            ]),
          }),
        }),
      }),
    );
  const fitted = page(4.9, 0.1, 0, 5);
  assert.equal(fitted.pageCount, 1);
  assert.ok(render(fitted.document).length > 0);
  assert.throws(() => page(0.1, 0.2, 0.3, 0.6));
});
