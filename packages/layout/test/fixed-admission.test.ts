import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import { layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { prepare } from "../dist/blocks.js";
import { isFixedProducer } from "../dist/fixed-admission.js";
import { Paginator } from "../dist/paginator.js";
import { template } from "../dist/template.js";
import type { PreparedBlock } from "../dist/protocol.js";
import { flow } from "./fixtures.js";

const fixed = (height: number) => ({ type: "fixed" as const, height, children: [] });

test("direct fixed admission preserves certifiable fits and recovers only refused native candidates", () => {
  const cases = [
    { heights: [4.9, 0.1], height: 5, top: 0, pages: 1 },
    { heights: [1.2, 1.1], height: 2.3, top: 0, pages: 1 },
    { heights: [0.1, 0.2], height: 0.3, top: 0, pages: 2 },
    { heights: [10.3, 10.3, 10.3], height: 30.9, top: 0, pages: 2 },
    { heights: [0.1, 0.2], height: 0.3, top: 10, pages: 1 },
    { heights: [10.3, 10.3, 10.3], height: 30.9, top: 700, pages: 1 },
    { heights: [0.9999999999999999, 1e-17], height: 1, top: 0, pages: 1 },
    { heights: [1.2, 1.1, 0.1], height: 10, top: 1, pages: 2 },
  ];
  for (const { heights, height, top, pages } of cases) {
    const result = layoutFlow(
      flow(heights.map(fixed), {
        height: top + height,
        margins: { top, right: 0, bottom: 0, left: 0 },
      }),
    );
    assert.equal(result.pageCount, pages);
    assert.deepEqual(
      result.placements.map((p) => p.box.height),
      heights,
    );
    for (let page = 0; page < pages; page++) {
      let bottom = top;
      for (const { box } of result.placements.filter((p) => p.pageIndex === page)) {
        assert.ok(box.y >= bottom);
        assert.ok(box.y + box.height <= top + height);
        bottom = box.y + box.height;
      }
    }
  }
});

test("fresh metric oversized and native refusal retain their distinct exact diagnostics", () => {
  assert.throws(() => layoutFlow(flow([fixed(2)], { height: 1 })), diagnostic("LAYOUT_OVERSIZED", "/body/0"));
  assert.throws(() => layoutFlow(flow([fixed(0)])), diagnostic("GEOMETRY", "/body/0/height"));
  // Metric tolerance admits this successor, but the fresh native endpoint does not.
  assert.throws(
    () => layoutFlow(flow([fixed(1 + Number.EPSILON)], { height: 1 })),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.deepEqual(error.diagnostics, [
        {
          code: "GEOMETRY",
          path: "/body/0",
          message: "Materialized geometry exceeds its derived region under native coordinate association.",
        },
      ]);
      return true;
    },
  );
});

function diagnostic(code: string, path: string) {
  return (error: unknown) =>
    error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path;
}

test("registration belongs only to the final fixed identity; reuse works but copies and wrappers stay strict", () => {
  const operation = createDrawingLayoutOperation({});
  try {
    const page = template(flow([], { height: 0.3 }).pageTemplate, operation);
    const first = prepare(fixed(0.1), 100, "/first", operation);
    const second = prepare(fixed(0.2), 100, "/second", operation);
    assert.ok(isFixedProducer(second));
    assert.equal(isFixedProducer({ ...second }), false);
    for (let reuse = 0; reuse < 2; reuse++) {
      const paginator = new Paginator(page, operation.policy);
      paginator.consume(first, 0);
      paginator.consume(second, 1);
      assert.equal(paginator.result(2).pageCount, 2);
    }
    const strict = new Paginator(page, operation.policy);
    strict.consume(first, 0);
    assert.throws(() => strict.consume({ ...second }, 1), diagnostic("GEOMETRY", "/body/1"));
    for (const value of [
      { type: "spacer", height: 0.2 },
      { type: "block", children: [fixed(0.2)] },
      { type: "block", keepTogether: true, style: { marginTop: "auto" }, children: [fixed(0.2)] },
    ])
      assert.equal(isFixedProducer(prepare(value, 100, "/wrapper", operation, undefined, undefined, 0.3)), false);
  } finally {
    operation.close();
  }
});

test("unknown atomic actual heights, zero-height fragments and page controls retain old behavior", () => {
  const operation = createDrawingLayoutOperation({});
  try {
    const page = template(flow([], { height: 0.3 }).pageTemplate, operation);
    const paginator = new Paginator(page, operation.policy);
    paginator.consume(prepare(fixed(0.1), 100, "/first", operation), 0);
    const atomic: PreparedBlock = {
      fragmentation: "atomic",
      naturalSize: { width: 100, height: 0 },
      extent: 1,
      fragment: () => ({ nextOffset: 1, height: 0.2, paint: () => [] }),
    };
    assert.throws(() => paginator.consume(atomic, 1), diagnostic("GEOMETRY", "/body/1"));
    const zero = new Paginator(page, operation.policy);
    zero.consume({ ...atomic, fragment: () => ({ nextOffset: 1, height: 0, paint: () => [] }) }, 0);
    assert.equal(zero.placements[0]?.box.y, 0);
    zero.consume(prepare({ type: "pageBreak" }, 100, "/break", operation), 1);
    assert.equal(zero.result(2).pageCount, 2);
  } finally {
    operation.close();
  }
});
