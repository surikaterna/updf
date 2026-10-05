import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import {
  block,
  column,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  type FlowBlock,
  flow,
  paragraph,
  type RowAlignment,
  row,
} from "@updf/layout";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

const spacer = (height: number): FlowBlock => ({ type: "spacer", height });
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
function run(children: readonly FlowBlock[], height = 100, width = 100) {
  return layout(document({ children: flow({ pageSize: { width, height }, margins, children }) }));
}
function reject(callback: () => unknown, code?: string): void {
  assert.throws(
    callback,
    (error: unknown) => error instanceof DocumentError && (!code || error.diagnostics[0]?.code === code),
  );
}
function groups(nodes: readonly NodeDefinition[]): Extract<NodeDefinition, { type: "paintGroup" }>[] {
  return nodes.filter((node) => node.type === "paintGroup");
}
test("data Rows render real PDFs with fixed/weighted tracks, box insets and independent gaps", () => {
  const item = row({
    style: { padding: 2, gap: 4 },
    children: [
      column({
        width: 20,
        style: { padding: 1, gap: 3 },
        children: [paragraph({ children: "A" }), paragraph({ children: "B" })],
      }),
      column({ width: { weight: 2, min: 30, max: 80 }, children: [paragraph({ children: "C" })] }),
    ],
  });
  const measured = measure(item, { width: 100 });
  assert.deepEqual(measured.size, { width: 100, height: 29 });
  const result = run([item]);
  const outer = groups(result.document.pages[0]?.children ?? [])[0];
  assert.ok(outer);
  assert.deepEqual(
    groups(outer.children).map((node) => node.transform),
    [
      [1, 0, 0, 1, 2, 2],
      [1, 0, 0, 1, 26, 2],
    ],
  );
  const bytes = render(result.document);
  assert.match(new TextDecoder().decode(bytes), /^%PDF-/);
  assert.deepEqual(render(run([item]).document), bytes);
});
test("all track and inset constraints fail before any adapter measurement", () => {
  const widths: number[] = [];
  const adapter = defineBlockAdapter({
    name: "row.width-spy",
    validate: (input) => input,
    measure(_props, context) {
      widths.push(context.width);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 2 },
        fragment: () => ({ status: "placed", nextOffset: 1, height: 2, nodes: [] }),
      };
    },
  });
  const child = extension(adapter, {}),
    extensions = createExtensions([adapter]);
  const inspect = (second: ReturnType<typeof column>) =>
    measure(row({ children: [column({ width: 20, children: [child] }), second] }), { width: 100 }, { extensions });
  reject(() => inspect(column({ width: 90, children: [] })), "GEOMETRY");
  reject(() => inspect(column({ width: 80, style: { padding: 40 }, children: [] })), "GEOMETRY");
  assert.deepEqual(widths, []);
  inspect(column({ width: { weight: 1 }, style: { paddingLeft: 3, paddingRight: 7 }, children: [child] }));
  assert.deepEqual(widths, [20, 70]);
});
test("alignment moves border boxes; stretch grows decorations without measuring at another width", () => {
  for (const align of ["top", "middle", "bottom", "stretch"] as RowAlignment[]) {
    const item = row({
      align,
      children: [
        column({ children: [spacer(30)] }),
        column({
          style: {
            paddingTop: 2,
            borderBottom: { width: 3, color: [0, 0, 0] },
            backgroundColor: [1, 0, 0],
          },
          children: [spacer(5)],
        }),
      ],
    });
    const result = run([item]);
    const outer = groups(result.document.pages[0]?.children ?? [])[0];
    assert.ok(outer);
    const second = groups(outer.children)[1];
    assert.ok(second);
    assert.equal(second.transform?.[5], align === "middle" ? 10 : align === "bottom" ? 20 : 0);
    const background = second.children.find((node) => node.type === "rect");
    assert.equal(background?.height, align === "stretch" ? 30 : 10);
    assert.ok(render(result.document).length > 0);
  }
  for (const key of ["height", "minHeight", "maxHeight"])
    reject(
      () =>
        measure(row({ align: "stretch", children: [column({ children: [], style: { [key]: 20 } })] }), { width: 100 }),
      "TYPE",
    );
});
test("Rows are atomic on same page or deferred, and never silently hide oversized Rows", () => {
  const item = row({ children: [column({ children: [spacer(30)] }), column({ children: [spacer(10)] })] });
  assert.equal(run([spacer(10), item], 40).pageCount, 1);
  assert.equal(run([spacer(11), item], 40).pageCount, 2);
  reject(() => run([item], 29));
  reject(() => measure({ ...item, keepTogether: false } as unknown as FlowBlock, { width: 100 }), "KEY");
  reject(() => measure(row({ children: [column({ children: [{ type: "pageBreak" }] })] }), { width: 100 }));
  reject(() => measure({ ...item, style: { overflow: "hidden" } } as unknown as FlowBlock, { width: 100 }), "TYPE");
});
test("nested Rows, explicit clips, empty boxes and standalone Column pagination use native containers", () => {
  const nested = row({
    children: [
      column({
        style: { gap: 4 },
        children: [
          row({ children: [column({ children: [spacer(3)] }), column({ children: [] })] }),
          block({ children: [spacer(30)], style: { height: 5, overflow: "hidden" } }),
        ],
      }),
      column({ children: [], style: { height: 7, backgroundColor: [0, 1, 0] } }),
    ],
  });
  assert.equal(measure(nested, { width: 100 }).size.height, 12);
  assert.ok(render(run([nested]).document).length > 0);
  assert.equal(measure(row({ children: [], style: { padding: 2 } }), { width: 100 }).size.height, 4);
  assert.equal(
    run([column({ children: [paragraph({ children: "A\nB\nC\nD\nE", whiteSpace: "preserve" })] })], 30).pageCount,
    2,
  );
  const kept = column({ width: 40, keepTogether: true, children: [spacer(20)] });
  assert.equal(run([spacer(21), kept], 40).pageCount, 2);
  assert.equal(measure(kept, { width: 100 }).size.width, 40);
  reject(
    () => measure({ type: "column", children: [], style: { width: 10 } } as unknown as FlowBlock, { width: 100 }),
    "KEY",
  );
});
test("fractional residual tracks remain renderable and factory snapshots isolate caller mutation", () => {
  const children = [
    column({ children: [paragraph({ children: "A" })] }),
    column({ children: [] }),
    column({ children: [] }),
  ];
  const item = row({ children, style: { gap: 0.1, paddingLeft: 0.2, paddingRight: 0.3 } });
  const before = render(run([item], 40, 100.7).document);
  children.pop();
  assert.deepEqual(render(run([item], 40, 100.7).document), before);
  for (const width of [1.1, 100.7, 760.03]) {
    const fractional = row({
      children: Array.from({ length: 7 }, () =>
        column({ children: [spacer(1)], style: { backgroundColor: [0, 0, 1] } }),
      ),
      style: { gap: 0.01 },
    });
    assert.ok(render(run([fractional], 10, width).document).length > 0);
  }
});
test("Column style rejects malformed runtime data with structured diagnostics", () => {
  for (const style of [null, 1, "box", [], { width: 10 }, { minWidth: 10 }, { maxWidth: 10 }])
    reject(() => measure({ type: "column", children: [], style } as unknown as FlowBlock, { width: 100 }));
});
