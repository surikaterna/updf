import assert from "node:assert/strict";
import test from "node:test";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { DocumentError } from "@updf/core";
import { type ComponentContext, createContext, h, useContext } from "@updf/core/vdom";
import {
  column,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  type FlowBlock,
  flow,
  type MeasureContext,
  Paragraph,
  paragraph,
  row,
  span,
} from "@updf/layout";
import { renderSVG } from "@updf/svg";
import { chart, chartAdapter } from "../../../tests/fixtures/chart.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

function reject(callback: () => unknown, code: string): void {
  assert.throws(callback, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
test("Rows compose charts and SVG through ordinary public adapter contracts", () => {
  const svg = defineBlockAdapter({
    name: "row.svg",
    validate: (input) => input,
    measure(_props, context) {
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 40 },
        fragment: () => ({
          status: "placed",
          nextOffset: 1,
          height: 40,
          nodes: [
            renderSVG('<svg viewBox="0 0 10 10"><rect width="10" height="10" fill="blue"/></svg>', {
              x: 0,
              y: 0,
              w: context.width,
              h: 40,
            }),
          ],
        }),
      };
    },
  });
  const extensions = createExtensions([chartAdapter, svg]);
  const item = row({
    style: { gap: 5 },
    children: [
      column({ children: [chart({ height: 40, values: [0.2, 0.8] })] }),
      column({ children: [extension(svg, {})] }),
    ],
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 200, height: 100 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions,
        children: item,
      }),
    }),
  );
  assert.equal(result.pageCount, 1);
  assert.match(new TextDecoder().decode(render(result.document)), /External chart/);
});
test("Row children keep provider/font context and close retained component measurement callbacks", async () => {
  const Font = createContext("Helvetica");
  let retained: ComponentContext | undefined;
  let calls = 0;
  function Content(_props: Record<string, never>, context: ComponentContext) {
    calls++;
    retained = context;
    return h(Paragraph, { style: { font: useContext(Font) }, children: "ABC" });
  }
  const child = h(Font.Provider, { value: "Demo", children: h(Content, {}) });
  const item = row({ children: [column({ children: [child as unknown as FlowBlock] })] });
  const font = await fixtureFont();
  const resources = { Demo: font };
  const measured = measure(item, { width: 100 }, { resources });
  assert.equal(calls, 1);
  const fragment = measured.lines[0]?.fragments[0];
  assert.ok(fragment?.role === "text");
  assert.equal(fragment.style.font, "Demo");
  assert.ok(retained);
  reject(() => retained?.measurement.measureText(richInput("x", 100, 10, 10)), "MEASUREMENT_CONTEXT");
  reject(() => measure(item, { width: 100 }), "FONT_RESOURCE");
  reject(() => retained?.measurement.measureText(richInput("x", 100, 10, 10)), "MEASUREMENT_CONTEXT");
});
test("deferred Rows emit only selected occurrences and retain owned adapter content until operation close", () => {
  let retained: MeasureContext | undefined,
    measures = 0,
    fragments = 0;
  const content = paragraph({ children: "AB" });
  const adapter = defineBlockAdapter({
    name: "row.owned-content",
    validate: (input) => input,
    measure(_props, context) {
      measures++;
      retained = context;
      const measured = context.measureContent(content, { width: context.width });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: measured.size,
        fragment() {
          fragments++;
          return { status: "placed", nextOffset: 1, height: measured.size.height, nodes: measured.nodes };
        },
      };
    },
  });
  const extensions = createExtensions([adapter]);
  const descriptor = extension(adapter, {});
  const item = row({ children: [column({ children: [descriptor] })] });
  const input = document({
    children: flow({
      pageSize: { width: 100, height: 15 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions,
      children: [{ type: "spacer", height: 6 }, item, item],
    }),
  });
  const result = layout(input, { limits: { textCodePoints: 4 } });
  assert.equal(result.pageCount, 3);
  assert.equal(measures, 1);
  assert.equal(fragments, 2);
  assert.equal((new TextDecoder().decode(render(result.document)).match(/\(AB\)/g) ?? []).length, 2);
  reject(() => retained?.measureContent(content, { width: 100 }), "MEASUREMENT_CONTEXT");
  reject(() => layout(input, { limits: { textCodePoints: 3 } }), "LIMIT");
  reject(() => retained?.measureContent(content, { width: 100 }), "MEASUREMENT_CONTEXT");
});
test("Row source diagnostics and quotas are preserved rather than bypassed by horizontal composition", () => {
  const item = row({ children: [column({ children: [paragraph({ children: span({ children: "xЖ" }) })] })] });
  assert.throws(
    () => measure(item, { width: 100 }),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "CHARACTER" &&
      /children\/0\/children\/0\/children\/children$/.test(error.diagnostics[0].path),
  );
  const boxes = row({
    children: [column({ children: [], style: { height: 1, backgroundColor: [0, 0, 0] } }), column({ children: [] })],
  });
  reject(() => measure(boxes, { width: 100 }, { limits: { nodes: 2 } }), "LIMIT");
});
