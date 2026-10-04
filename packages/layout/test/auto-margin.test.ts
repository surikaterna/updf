import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { Fragment } from "@updf/core/jsx-runtime";
import { h } from "@updf/core/vdom";
import { Block, Column, document, Flow, flow, layout, measure, pageSize, paragraph, Row } from "@updf/layout";
import { block, layoutFlowUnknown } from "../../../tests/fixtures/transitional-layout.js";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const box = (height: number) => block({ children: [], style: { height } });
const tail = (height: number) => block({ children: [], keepTogether: true, style: { height, marginTop: "auto" } });
const run = (children: NonNullable<Parameters<typeof flow>[0]["children"]>, height = 100) =>
  layout(document({ children: flow({ pageSize: pageSize(100, height), margins, children }) }));

function rejects(invoke: () => unknown, code: string, path?: string): void {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}

test("#53 direct body aligns outer box, preserves source count, exact fit and zero-height progress", () => {
  const result = run([box(30), tail(20)]);
  assert.deepEqual(
    result.placements.map((p) => [p.box.y, p.box.height]),
    [
      [0, 30],
      [80, 20],
    ],
  );
  assert.equal(result.pageCount, 1);
  assert.deepEqual(result, run([box(30), tail(20)]));
  assert.deepEqual(
    run([box(80), tail(20)]).placements.map((p) => p.box.y),
    [0, 80],
  );
  assert.deepEqual(
    run([box(100), tail(0)]).placements.map((p) => p.box.y),
    [0, 100],
  );
  assert.equal(run([tail(0)]).placements[0]?.box.y, 100);
});

test("#53 full decorated child uses body reservations independent of slot order", () => {
  const result = run(
    [
      h(Flow.Footer, { height: 18, children: null }),
      box(30),
      h(Block, {
        keepTogether: true,
        style: { height: 10, marginTop: "auto" },
        children: [h(Block.Header, { height: 4, children: null }), h(Block.Footer, { height: 6, children: null })],
      }),
      h(Flow.Header, { height: 12, children: null }),
    ],
    160,
  );
  assert.deepEqual(
    result.placements.map((p) => [p.box.y, p.box.height]),
    [
      [12, 30],
      [122, 20],
    ],
  );
  const withMargins = layout(
    document({
      children: flow({
        pageSize: pageSize(100, 160),
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        children: [
          h(Flow.Header, { height: 12, children: null }),
          box(30),
          tail(20),
          h(Flow.Footer, { height: 18, children: null }),
        ],
      }),
    }),
  );
  assert.equal(withMargins.placements[1]?.box.y, 112);
});

test("#53 explicit nested content region and natural parents differ; measured lines match ink", () => {
  const content = h(Block, {
    style: { height: 100, padding: 4, border: { width: 1, color: [0, 0, 0] }, gap: 5 },
    children: [
      box(20),
      h(Block, {
        keepTogether: true,
        style: { marginTop: "auto", height: 15 },
        children: paragraph({ style: { fontSize: 10, lineHeight: 1 }, children: "tail" }),
      }),
    ],
  });
  const measured = measure(content, { width: 100 });
  assert.equal(measured.size.height, 100);
  assert.equal(measured.lines[0]?.top, 80);
  assert.equal(run(content, 100).pageCount, 1);
  const natural = h(Block, {
    keepTogether: true,
    style: { minHeight: 100, gap: 5 },
    children: [
      box(20),
      h(Block, {
        keepTogether: true,
        style: { height: 15, marginTop: "auto" },
        children: paragraph({ style: { fontSize: 10, lineHeight: 1 }, children: "tail" }),
      }),
    ],
  });
  assert.equal(measure(natural, { width: 100, height: 100 }).lines[0]?.top, 25);
  assert.equal(
    measure(
      h(Block, {
        keepTogether: true,
        style: { marginTop: "auto", height: 15 },
        children: paragraph({ style: { fontSize: 10, lineHeight: 1 }, children: "tail" }),
      }),
      { width: 100, height: 200 },
    ).lines[0]?.top,
    0,
  );
});

test("#53 transition defers once and fresh oversize rejects; constrained parents never paginate internally", () => {
  const result = run([box(90), tail(20)]);
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => [p.pageIndex, p.box.y]),
    [
      [0, 0],
      [1, 80],
    ],
  );
  rejects(() => run([box(90), tail(101)]), "LAYOUT_OVERSIZED");
  rejects(() => run(h(Block, { style: { height: 20 }, children: [box(10), tail(15)] })), "VERTICAL_OVERFLOW");
  rejects(
    () => run(h(Block, { style: { height: 20, overflow: "hidden" }, children: [box(10), tail(15)] })),
    "VERTICAL_OVERFLOW",
  );
  rejects(
    () =>
      run(
        h(Block, {
          keepTogether: true,
          style: { marginTop: "auto", height: 10, overflow: "hidden" },
          children: box(15),
        }),
      ),
    "VERTICAL_OVERFLOW",
  );
});

test("#53 wrappers are transparent but empty semantic siblings and controls are real", () => {
  const wrapper = () =>
    h(Fragment, {
      children: [
        h(Block, { keepTogether: true, style: { height: 20, marginTop: "auto" }, children: [] }),
        null,
        false,
        [],
      ],
    });
  assert.equal(run([box(30), h(wrapper, {})]).placements[1]?.box.y, 80);
  for (const following of [paragraph({ children: "" }), box(0), { type: "spacer", height: 0 }, { type: "pageBreak" }])
    rejects(() => run([tail(20), following as never]), "VDOM_HIERARCHY");
  rejects(() => run([tail(0), tail(0)]), "VDOM_HIERARCHY");
  const result = run([{ type: "pageBreak" }, tail(20)]);
  assert.equal(result.pageCount, 2);
  assert.equal(result.placements[1]?.box.y, 80);
});

test("#53 local invalid guard precedes descendants, terminal guard precedes adapter measurement", () => {
  let calls = 0;
  const forbidden = () => {
    calls++;
    throw new Error("descendant ran");
  };
  for (const value of [undefined, null, 0, 10, "unknown"])
    rejects(
      () => run(h(Block, { keepTogether: true, style: { marginTop: value } as never, children: h(forbidden, {}) })),
      "VDOM_HIERARCHY",
    );
  rejects(
    () => run(h(Block, { style: { height: 20, marginTop: "auto" }, children: h(forbidden, {}) })),
    "VDOM_HIERARCHY",
  );
  assert.equal(calls, 0);
});

test("#53 other roles reject marginTop and native data gets the same eligibility validation", () => {
  for (const component of [Row, Column])
    rejects(
      () => run(h(component, { style: { marginTop: "auto" }, keepTogether: true, children: [] } as never)),
      "VDOM_HIERARCHY",
    );
  rejects(() => run(h(Block, { keepTogether: false, style: { marginTop: "auto" }, children: [] })), "VDOM_HIERARCHY");
  const native = { pageTemplate: { width: 100, height: 100, margins }, body: [box(30), tail(20)] };
  assert.equal(layoutFlowUnknown(native).placements[1]?.box.y, 80);
  rejects(
    () => layoutFlowUnknown({ ...native, body: [tail(20), box(0)] }),
    "VDOM_HIERARCHY",
    "/body/0/style/marginTop",
  );
  for (const value of [undefined, null, 2, "bad"])
    rejects(
      () =>
        layoutFlowUnknown({
          ...native,
          body: [{ type: "block", keepTogether: true, children: [], style: { marginTop: value } }],
        }),
      "VDOM_HIERARCHY",
      "/body/0/style/marginTop",
    );
});
