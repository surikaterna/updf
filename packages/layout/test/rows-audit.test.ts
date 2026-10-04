import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h } from "@updf/core/vdom";
import { column, document, type FlowBlock, flow, layout, measure, Paragraph, paragraph, row } from "@updf/layout";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function run(item: FlowBlock) {
  return layout(document({ children: flow({ pageSize: { width: 100, height: 100 }, margins, children: item }) }));
}
function reject(callback: () => unknown, code: string): void {
  assert.throws(callback, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function text(height: number) {
  return paragraph({ children: "A", style: { fontSize: height, lineHeight: { unit: "pt", value: height } } });
}

test("all Row alignments use the final clamped height before stretching including insets", () => {
  for (const align of ["top", "middle", "bottom", "stretch"] as const) {
    const item = row({
      align,
      style: { height: 30, maxHeight: 20, padding: 2 },
      children: [
        column({ style: { padding: 1, backgroundColor: [1, 0, 0] }, children: [{ type: "spacer", height: 10 }] }),
      ],
    });
    assert.equal(measure(item, { width: 100 }).size.height, 20);
    const result = run(item);
    const outer = result.document.pages[0]?.children[0];
    assert.ok(outer?.type === "paintGroup");
    const child = outer.children[0];
    assert.ok(child?.type === "paintGroup");
    assert.equal(child.transform?.[5], align === "bottom" ? 6 : align === "middle" ? 4 : 2);
    const background = child.children[0];
    assert.ok(background?.type === "rect");
    assert.equal(background.height, align === "stretch" ? 16 : 12);
    assert.ok(render(result.document).length > 0);
  }
});
test("fractional Row stretch preserves natural paragraph extents and rejects true overflow", () => {
  for (const align of ["top", "stretch"] as const) {
    const item = row({ align, style: { padding: 2.3 }, children: [column({ children: [text(30.7)] })] });
    assert.equal(measure(item, { width: 100 }).size.height, 35.3);
    assert.ok(render(run(item).document).length > 0);
    reject(() => measure({ ...item, style: { padding: 2.3, height: 35.2999 } }, { width: 100 }), "VERTICAL_OVERFLOW");
  }
});
test("fractional bottom alignment fits native reservations without weakening materialized geometry", () => {
  for (const align of ["top", "middle", "bottom"] as const) {
    const item = row({
      align,
      style: { padding: 1.1 },
      children: [column({ children: [text(2.3)] }), column({ children: [text(0.7)] })],
    });
    assert.equal(measure(item, { width: 100 }).size.height, 4.5);
    assert.ok(render(run(item).document).length > 0);
    reject(() => measure({ ...item, style: { padding: 1.1, height: 4.4999 } }, { width: 100 }), "VERTICAL_OVERFLOW");
  }
});
test("known Column bodies do not invoke native VNode components before Row preflight", () => {
  let calls = 0;
  function Child() {
    calls++;
    return h(Paragraph, { children: "A" });
  }
  const first = column({ width: 80, children: [h(Child, {}) as unknown as FlowBlock] });
  const cases = [
    row({ children: [first, column({ width: 80, children: [] })] }),
    row({ children: [first, column({ width: 20, style: { padding: 11 }, children: [] })] }),
    row({ align: "stretch", children: [first, column({ width: 20, style: { height: 10 }, children: [] })] }),
  ];
  cases.forEach((item, index) => {
    reject(() => measure(item, { width: 100 }), index === 2 ? "TYPE" : "GEOMETRY");
    reject(() => run(item), index === 2 ? "TYPE" : "GEOMETRY");
    assert.equal(calls, 0);
  });
  const valid = row({ children: [first, column({ width: 20, children: [] })] });
  assert.equal(measure(valid, { width: 100 }).size.height, 10);
  assert.equal(calls, 1);
  assert.ok(render(run(valid).document).length > 0);
  assert.equal(calls, 2);
});
test("deferred Column normalization retains active ancestry and source depth limits", () => {
  const cyclic: { type: "column"; children: FlowBlock[] } = { type: "column", children: [] };
  cyclic.children.push(cyclic);
  reject(() => measure(cyclic, { width: 100 }), "VDOM_CYCLE");
  let nested: FlowBlock = { type: "spacer", height: 1 };
  for (let i = 0; i < 6; i++) nested = column({ children: [nested] });
  reject(() => measure(nested, { width: 100 }, { limits: { depth: 8 } }), "LIMIT");
  assert.equal(measure(nested, { width: 100 }).size.height, 1);
});
