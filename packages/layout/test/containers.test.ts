import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import {
  type BlockStyle,
  block,
  createDecorationPlan,
  createExtensions,
  defineBlockAdapter,
  extension,
  type FlowBlock,
  layoutFlow,
  layoutFlowUnknown,
} from "../../../tests/fixtures/transitional-layout.js";
import { flow, paragraph } from "./fixtures.js";

const inset = (n: number) => ({ top: n, right: n, bottom: n, left: n });
const text = (value: string): FlowBlock => ({ type: "paragraph", paragraph: paragraph(value) });
function rejects(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
test("border-box sizing fills width, subtracts padding/border, and gaps only separate children", () => {
  const result = layoutFlow(
    flow(
      [
        block({
          children: [text("A"), text("B")],
          style: {
            padding: inset(2),
            border: { width: 1, color: [0, 0, 0] },
            gap: 3,
            background: [1, 1, 0],
          },
        }),
      ],
      { width: 100, height: 100 },
    ),
  );
  assert.equal(result.placements[0]?.box.width, 100);
  assert.equal(result.placements[0]?.box.height, 29);
  const group = result.document.pages[0]?.children[0];
  assert.equal(group?.type, "paintGroup");
  if (group?.type !== "paintGroup") return;
  const lines = group.children.filter((node) => node.type === "richText");
  assert.deepEqual(
    lines.map((line) => [line.x, line.y, line.width]),
    [
      [3, 3, 94],
      [3, 16, 94],
    ],
  );
  assert.equal(group.children.filter((node) => node.type === "rect").length, 5);
  assert.ok(render(result.document).length > 0);
});
test("width min/max clamps computed width without implicit fitting shrink; contradictions reject", () => {
  const result = layoutFlow(
    flow([block({ children: [], style: { width: 80, minWidth: 20, maxWidth: 60 } })], { height: 100 }),
  );
  assert.equal(result.placements[0]?.box.width, 60);
  for (const style of [
    { minWidth: 60, maxWidth: 50 },
    { minHeight: 60, maxHeight: 50 },
    { width: 101 },
    { minWidth: 101 },
  ])
    rejects(() => layoutFlow(flow([block({ children: [], style })])), "GEOMETRY");
});
test("finite style schema rejects negative/undefined/nonfinite values, getters and erased content regions", () => {
  for (const key of ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "gap"]) {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, undefined])
      rejects(
        () => layoutFlowUnknown(flow([block({ children: [], style: { [key]: value } as BlockStyle })])),
        "GEOMETRY",
      );
  }
  rejects(() => layoutFlow(flow([block({ children: [], style: { width: 0 } })])), "GEOMETRY");
  rejects(() => layoutFlow(flow([block({ children: [], style: { padding: inset(50) } })])), "GEOMETRY");
  let reads = 0;
  const style = Object.defineProperty({}, "height", {
    enumerable: true,
    get() {
      reads++;
      return 10;
    },
  });
  rejects(() => block({ children: [], style }), "TYPE");
  assert.equal(reads, 0);
  for (const style of [{ padding: undefined }, { border: undefined }, { overflow: "visible" }, { margin: 1 }])
    assert.throws(() => layoutFlowUnknown(flow([{ type: "block", children: [], style } as unknown as FlowBlock])));
});
test("natural auto height fragments complete children/lines and clones padding/border on each fragment", () => {
  const result = layoutFlow(
    flow([
      block({
        children: [text("A\nB\nC\nD\nE")],
        style: { padding: inset(2), border: { width: 1, color: [0, 0, 0] } },
      }),
    ]),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [36, 26],
  );
  assert.equal(result.consumed, 1);
});
test("keepTogether moves once or errors independently from error/hidden overflow", () => {
  for (const overflow of ["error", "hidden"] as const) {
    const item = block({ children: [text("A\nB")], keepTogether: true, style: { overflow } });
    const exact = layoutFlow(flow([{ type: "spacer", height: 20 }, item]));
    assert.equal(exact.pageCount, 1);
    assert.equal(exact.placements[1]?.box.height, 20);
    const result = layoutFlow(flow([{ type: "spacer", height: 30 }, item]));
    assert.equal(result.placements[1]?.pageIndex, 1);
    rejects(
      () => layoutFlow(flow([block({ children: [text("A\nB\nC\nD\nE")], keepTogether: true, style: { overflow } })])),
      "LAYOUT_OVERSIZED",
    );
  }
});
test("explicit/max constrained heights error by default or clip a closed box without continuation pages", () => {
  const children = [text("A\nB\nC\nD\nE")];
  for (const style of [{ height: 25 }, { maxHeight: 25 }]) {
    rejects(() => layoutFlow(flow([block({ children, style })])), "VERTICAL_OVERFLOW");
    const hidden = layoutFlow(flow([block({ children, style: { ...style, overflow: "hidden" } })]));
    assert.equal(hidden.pageCount, 1);
    assert.equal(hidden.placements[0]?.box.height, 25);
    const outer = hidden.document.pages[0]?.children[0];
    assert.equal(outer?.type, "paintGroup");
    if (outer?.type === "paintGroup") assert.equal(outer.children[0]?.type, "paintGroup");
  }
  assert.equal(layoutFlow(flow([block({ children, style: { overflow: "hidden" } })])).pageCount, 2);
});
test("minHeight blank space fragments arithmetically, including nested insets and zero height", () => {
  const result = layoutFlow(flow([block({ children: [], style: { minHeight: 70 } })]));
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [40, 30],
  );
  const nested = layoutFlow(
    flow([block({ children: [block({ children: [], style: { minHeight: 70 } })], style: { padding: inset(2) } })]),
  );
  assert.deepEqual(
    nested.placements.map((p) => p.box.height),
    [40, 38],
  );
  assert.equal(layoutFlow(flow([block({ children: [], style: { height: 0 } })])).placements[0]?.box.height, 0);
  rejects(
    () => layoutFlow(flow([block({ children: [text("A")], style: { height: 0, overflow: "hidden" } })])),
    "GEOMETRY",
  );
});
test("sub-point minHeight blank fragments use the owned capacity, not a hidden one-point quantum", () => {
  const result = layoutFlow(flow([block({ children: [], style: { minHeight: 0.2 } })], { height: 0.1 }));
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [0.1, 0.1],
  );
});
test("gap consumption and nested explicit page advance are finite generic progress", () => {
  const result = layoutFlow(
    flow([block({ children: [text("A"), { type: "pageBreak" }, text("B")], style: { gap: 3 } })]),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => p.box.height),
    [10, 13],
  );
  rejects(() => layoutFlow(flow([block({ children: [{ type: "pageBreak" }], keepTogether: true })])), "TYPE");
});
test("fractional translated content axes retain the existing numerical certificate and ink rules", () => {
  const result = layoutFlow(
    flow(
      [
        block({
          children: [text("AAAAAAAAA\nAAAAAAAAA\nAAAAAAAAA")],
          style: { padding: { top: 700, left: 700, bottom: 0, right: 0 } },
        }),
      ],
      { width: 760.03, height: 730.9 },
    ),
  );
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 0);
  rejects(
    () =>
      layoutFlow(
        flow([block({ children: [], style: { padding: { top: 0, right: 0, bottom: 0, left: 1e20 - 16384 } } })], {
          width: 1e20,
        }),
      ),
    "GEOMETRY",
  );
});
test("container normalization preserves extension/decoration capabilities and caches repeated measurement", () => {
  let calls = 0;
  const adapter = defineBlockAdapter({
    name: "cache",
    validate: (input) => input,
    measure(_props, context) {
      calls++;
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 4 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 4, nodes: [] }),
      };
    },
  });
  const descriptor = extension(adapter, {});
  const decoration = createDecorationPlan([{ edge: "before", repeat: "all", height: 2, nodes: [] }]);
  const result = layoutFlow(
    flow([block({ children: [descriptor, descriptor], decorations: decoration })]),
    {},
    createExtensions([adapter]),
  );
  assert.equal(calls, 1);
  assert.equal(result.placements[0]?.box.height, 10);
  rejects(
    () =>
      layoutFlowUnknown(
        JSON.parse(JSON.stringify(flow([block({ children: [descriptor] })]))),
        {},
        createExtensions([adapter]),
      ),
    "TYPE",
  );
});
test("trusted deeply nested containers do not depend on the JavaScript call stack", () => {
  let item: FlowBlock = { type: "spacer", height: 1 };
  for (let depth = 0; depth < 3000; depth++) item = { type: "block", children: [item] };
  const result = layoutFlow(flow([item]));
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 0);
});
