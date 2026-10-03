import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { layoutFlow, layoutFlowUnknown } from "@updf/layout";
import { Flow } from "@updf/layout/vdom";
import { fixed, flow, paragraph } from "./fixtures.js";

function diagnostic(run: () => unknown, code: string, path?: string): void {
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}
test("empty, exact fit, implicit atomic advance and just-over geometry", () => {
  assert.equal(layoutFlow(flow()).pageCount, 1);
  assert.equal(layoutFlow(flow([{ type: "spacer", height: 40 }])).pageCount, 1);
  const result = layoutFlow(
    flow([
      { type: "spacer", height: 39 },
      { type: "spacer", height: 2 },
    ]),
  );
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.map((p) => [p.pageIndex, p.box.y]),
    [
      [0, 0],
      [1, 0],
    ],
  );
  diagnostic(() => layoutFlow(flow([{ type: "spacer", height: 40.000001 }])), "LAYOUT_OVERSIZED", "/body/0");
  diagnostic(() => layoutFlow(flow([], { width: 0 })), "GEOMETRY", "/pageTemplate/width");
  diagnostic(() => layoutFlow(flow([], { margins: { top: 40, right: 0, bottom: 0, left: 0 } })), "GEOMETRY");
});
test("explicit leading, trailing and consecutive page breaks intentionally retain blanks", () => {
  const result = layoutFlow(flow([{ type: "pageBreak" }, { type: "pageBreak" }]));
  assert.equal(result.pageCount, 3);
  assert.equal(result.consumed, 2);
  assert.deepEqual(
    result.document.pages.map((p) => p.children),
    [[], [], []],
  );
  assert.deepEqual(
    result.placements.map((p) => [p.sourceIndex, p.pageIndex, p.box.height]),
    [
      [0, 0, 0],
      [1, 1, 0],
    ],
  );
});
test("paragraphs split only at complete measured lines, keepTogether moves once or rejects", () => {
  const definition = flow([
    { type: "spacer", height: 30 },
    { type: "paragraph", paragraph: paragraph("A\nB\nC") },
  ]);
  const result = layoutFlow(definition);
  assert.equal(result.pageCount, 2);
  assert.deepEqual(
    result.placements.slice(1).map((p) => p.lines),
    [
      { start: 0, end: 1 },
      { start: 1, end: 3 },
    ],
  );
  const kept = layoutFlow(
    flow([definition.body[0]!, { type: "paragraph", paragraph: paragraph("A\nB\nC"), keepTogether: true }]),
  );
  assert.equal(kept.placements[1]?.pageIndex, 1);
  diagnostic(
    () => layoutFlow(flow([{ type: "paragraph", paragraph: paragraph("A\nB\nC\nD\nE"), keepTogether: true }])),
    "LAYOUT_OVERSIZED",
  );
  diagnostic(
    () => layoutFlow(flow([{ type: "paragraph", paragraph: paragraph("A", { lineHeight: 50 }) }])),
    "LAYOUT_OVERSIZED",
  );
});
test("fixed blocks and repeated regions must fit their own local bounds", () => {
  const input = flow([{ type: "fixed", height: 10, children: [fixed("Body")] }], {
    header: { height: 10, children: [fixed()] },
    footer: { height: 10, children: [fixed("Footer")] },
    headerBodyGap: 3,
    bodyFooterGap: 3,
  });
  const result = layoutFlow(input);
  assert.equal(result.placements[0]?.box.y, 13);
  assert.equal(result.document.pages[0]?.children.length, 3);
  diagnostic(
    () => layoutFlow(flow([], { header: { height: 9, children: [fixed()] } })),
    "BOUNDS",
    "/pageTemplate/header/children/0",
  );
  diagnostic(
    () => layoutFlow(flow([{ type: "fixed", height: 9, children: [fixed()] }])),
    "BOUNDS",
    "/body/0/children/0",
  );
  diagnostic(() => layoutFlow(flow([], { footer: { height: 40, children: [] } })), "GEOMETRY");
  assert.equal(layoutFlow(flow([], { headerBodyGap: 100, bodyFooterGap: 100 })).pageCount, 1);
});
test("fixed region bounds include default primitive stroke ink, not just legacy endpoints", () => {
  const rect = { type: "rect" as const, x: 0, y: 0, width: 10, height: 10 };
  diagnostic(() => layoutFlow(flow([{ type: "fixed", height: 10, children: [rect] }])), "BOUNDS", "/body/0/children/0");
  const line = { type: "line" as const, x: 0, y: 1, x2: 10, y2: 1 };
  diagnostic(
    () => layoutFlow(flow([], { header: { height: 10, children: [line] } })),
    "BOUNDS",
    "/pageTemplate/header/children/0",
  );
  assert.equal(layoutFlow(flow([{ type: "fixed", height: 22, children: [{ ...rect, x: 6, y: 6 }] }])).pageCount, 1);
});
test("trusted page 21 succeeds; service page 21 fails before repeated template output allocation", () => {
  const breaks = Array.from({ length: 19 }, () => ({ type: "pageBreak" as const }));
  assert.equal(layoutFlow(flow(breaks)).pageCount, 20);
  assert.equal(layoutFlow(flow([...breaks, { type: "pageBreak" }])).pageCount, 21);
  diagnostic(() => layoutFlow(flow([...breaks, { type: "pageBreak" }]), { profile: "service" }), "LIMIT", "/body/19");
  const paragraphs = Array.from({ length: 20 }, () => ({
    type: "paragraph" as const,
    paragraph: paragraph("A\nB\nC\nD"),
  }));
  assert.equal(layoutFlow(flow(paragraphs)).pageCount, 20);
  diagnostic(() => layoutFlow(flow([...paragraphs, paragraphs[0]!]), { profile: "service" }), "LIMIT", "/body/20");
});
test("unknown data, cumulative budgets, immutable snapshots and deterministic bytes", () => {
  const input = flow([{ type: "paragraph", paragraph: paragraph("A  B\nC") }]);
  const result = layoutFlowUnknown(input);
  assert.ok(Object.isFrozen(result.document.pages[0]?.children[0]));
  assert.ok(Object.isFrozen(result.placements[0]?.box));
  assert.deepEqual(result, layoutFlow(input));
  assert.deepEqual(render(result.document), render(layoutFlow(input).document));
  diagnostic(() => layoutFlowUnknown({ ...input, extra: 1 }), "KEY", "/extra");
  diagnostic(
    () =>
      layoutFlowUnknown(flow([{ type: "paragraph", paragraph: paragraph("x".repeat(4097)) }]), {
        limits: { textCodePoints: 4096 },
      }),
    "LIMIT",
  );
  diagnostic(
    () =>
      layoutFlowUnknown(
        flow(Array.from({ length: 25 }, () => ({ type: "paragraph", paragraph: paragraph("x".repeat(4096)) }))),
        { profile: "service" },
      ),
    "LIMIT",
  );
  diagnostic(() => layoutFlowUnknown({ ...input, body: new Array(2) }), "TYPE");
  let calls = 0;
  diagnostic(
    () =>
      layoutFlowUnknown({
        get body() {
          calls++;
          return [];
        },
      }),
    "TYPE",
  );
  assert.equal(calls, 0);
});
test("ordinary component lowering yields exactly native layout bytes and diagnostic prefix", () => {
  const input = flow([{ type: "paragraph", paragraph: paragraph("A\nB\nC\nD\nE") }]);
  assert.deepEqual(render(lower(h(Flow.Document, input))), render(layoutFlow(input).document));
  const bad = flow([{ type: "paragraph", paragraph: paragraph("\t") }]);
  diagnostic(() => layoutFlow(bad), "CHARACTER", "/body/0/paragraph/runs/0/text");
  diagnostic(() => lower(h(Flow.Document, bad)), "CHARACTER", "/tree/body/0/paragraph/runs/0/text");
});
