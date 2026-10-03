import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type ComponentContext, h } from "@updf/core/vdom";
import { Block, block, measure, Paragraph, paragraph, Span, span } from "@updf/layout";
import { layoutTableFlow } from "../src/tables/index.js";

function reject(callback: () => unknown, code: string, path?: RegExp): void {
  assert.throws(
    callback,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || path.test(error.diagnostics[0].path)),
  );
}
test("D: known invalid roles reject before expanding their descendant components", () => {
  let calls = 0;
  const Child = () => {
    calls++;
    return h(Span, { children: "x" });
  };
  reject(
    () => measure(h(Paragraph, { children: h(Block, { children: h(Child, {}) }) }), { width: 100 }),
    "VDOM_HIERARCHY",
  );
  assert.equal(calls, 0);
});
test("D: empty and overridden-away Span styles still validate without inventing text runs", () => {
  reject(
    () => measure(paragraph({ children: span({ style: { fontSize: -1 } }) }), { width: 100 }),
    "GEOMETRY",
    /style\/fontSize$/u,
  );
  reject(
    () =>
      measure(
        paragraph({
          children: span({
            style: { font: "Absent" },
            children: span({ style: { font: "Helvetica" }, children: "x" }),
          }),
        }),
        { width: 100 },
      ),
    "FONT_RESOURCE",
    /style\/font$/u,
  );
  assert.equal(measure(paragraph({ children: span({ style: { fontSize: 20 } }) }), { width: 100 }).size.height, 12);
});
test("D: subnormal text advances retain representable native boxes without a point-size floor", () => {
  const measured = measure(paragraph({ defaultStyle: { fontSize: Number.MIN_VALUE }, align: "right", children: "i" }), {
    width: 100,
  });
  assert.equal(measured.size.height, 12);
  assert.equal(measured.lines[0]?.advance, 0);
});
test("D: the shared compiler normalizes authored prose in the existing mixed table entry and closes wrapper contexts", () => {
  let retained: ComponentContext | undefined;
  const Child = (_props: Record<never, never>, context: ComponentContext) => {
    retained = context;
    return "x";
  };
  const pageTemplate = { width: 120, height: 120, margins: { top: 10, right: 10, bottom: 10, left: 10 } };
  const result = layoutTableFlow({
    pageTemplate,
    body: [block({ children: [paragraph({ children: h(Child, {}) })] })],
  });
  assert.equal(result.pageCount, 1);
  assert.ok(retained);
  const context = retained;
  reject(
    () =>
      context.measurement.measureText({
        kind: "plain",
        text: "x",
        width: 10,
        fontSize: 10,
        lineHeight: 12,
        align: "left",
      }),
    "MEASUREMENT_CONTEXT",
  );
});
