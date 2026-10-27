import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { render } from "@updf/core";
import { Document, Flow, Paragraph, Block, layout, pt } from "@updf/layout";
import { protocolFixture } from "./sibling-protocol-fixture.js";
import { siblingFlow as f, siblingOptions } from "../../../tests/fixtures/text-flow/siblings.js";
import { prepareFragmentPaint } from "../../layout/dist/cjs/fragment-paint-preparation.js";
import { collectPreparedLines } from "../../layout/dist/cjs/prepared-line-reports.js";

test("float-band adjacent heights retain the crossing line, then tail starts at full width", () => {
  for (const height of [20 - 4 * Number.EPSILON, 20, 20 + 4 * Number.EPSILON, 20.001]) {
    const p = protocolFixture([
      h(f.Block, { style: { width: 72, height, float: "right" } }),
      h(Paragraph, { children: "paragraph words ".repeat(30), style: { lineHeight: pt(10) } }),
    ]);
    try {
      const selected = p.block.fragment(p.request)!;
      const lines: Parameters<typeof collectPreparedLines>[1] = [];
      collectPreparedLines(prepareFragmentPaint(selected, { x: 0, y: 0 }, p.request.budget, "/numeric").root, lines);
      assert.equal(lines.length, height === 20.001 ? 3 : 2);
      assert.ok(selected.height >= height && selected.nextOffset > 1);
      assert.ok(lines.every((line) => line.fragments.every((fragment) => fragment.x < 128)));
    } finally {
      p.close();
    }
  }
});
test("fractional margins/origins and near-bottom deferral preserve finite monotone native placements", () => {
  const result = layout(
    h(Document, {
      children: h(Flow, {
        pageSize: { width: 220.75, height: 140.5 },
        margins: { top: 0.1, right: 0.3, bottom: 0.2, left: 0.7 },
        children: [
          h(Block, { style: { height: 120.2 }, children: null }),
          h(f.Block, { style: { width: 72.125, height: 36.25, float: "left" } }),
          h(Paragraph, { children: "finite source progress ".repeat(60), style: { lineHeight: pt(10.125) } }),
        ],
      }),
    }),
    siblingOptions,
  );
  assert.equal(result.placements[1]!.pageIndex, 1);
  for (const placement of result.placements) {
    assert.ok(Object.values(placement.box).every(Number.isFinite));
    assert.ok(placement.box.height > 0);
  }
  assert.ok(render(result.document, siblingOptions).length > 0);
});
test("normal Block maxWidth owns the resolved exclusion origin as well as the available interval", () => {
  const p = protocolFixture([
    h(f.Block, { style: { width: 72, maxWidth: 36, height: 20, float: "left" } }),
    h(Paragraph, { children: "normal resolved width source ".repeat(10) }),
  ]);
  try {
    const lines: Parameters<typeof collectPreparedLines>[1] = [];
    collectPreparedLines(
      prepareFragmentPaint(p.block.fragment(p.request)!, { x: 0, y: 0 }, p.request.budget, "/width").root,
      lines,
    );
    assert.equal(lines[0]!.fragments[0]!.x, 36);
  } finally {
    p.close();
  }
});
