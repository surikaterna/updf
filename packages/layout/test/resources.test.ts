import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type Component, type ComponentContext, h } from "@updf/core/vdom";
import { createPreparedFont } from "@updf/fonts";
import { fixtureFont, fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { lower, measureText, render } from "../../../tests/fixtures/text-options.js";
import { LegacyFlow as Flow, layoutFlow, layoutFlowUnknown } from "../../../tests/fixtures/transitional-layout.js";
import { flow, paragraph } from "./fixtures.js";

test("prepared resources are owned and operation-bound, aliases work and retained contexts close", async () => {
  const font = await fixtureFont();
  const definition = flow([
    {
      type: "paragraph",
      paragraph: paragraph("Привет\nА\nБ", {
        defaultStyle: { font: "Alias", fontSize: 10, color: [0, 0, 0] },
        align: "center",
        lineHeight: 14,
      }),
    },
  ]);
  const expected = layoutFlow(definition, { resources: { Alias: font } });
  const resources = { Alias: font };
  let retained: ComponentContext | undefined;
  const wrapper: Component<object> = (_props, context) => {
    retained = context;
    Reflect.deleteProperty(resources, "Alias");
    return h(Flow.Document, definition);
  };
  const native = lower(h(wrapper, {}), { resources });
  assert.deepEqual(
    render(native, { resources: { Alias: font } }),
    render(expected.document, { resources: { Alias: font } }),
  );
  assert.ok(retained);
  const closed = retained;
  assert.throws(
    () => Flow.Document(definition, closed),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
  );
  assert.throws(
    () => layoutFlow(definition, { resources: { Alias: { ...font } } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "FONT_RESOURCE",
  );
});
test("materialized lines preserve whitespace, alignment, mixed styles and measured baseline/ink", async () => {
  const options = { resources: { Demo: await fixtureFont() } };
  const p = paragraph("", {
    runs: [
      { text: "А  ", style: { font: "Demo", color: [1, 0, 0] } },
      { text: " B\n\nC trailing  ", style: { fontSize: 12, color: [0, 0, 1] } },
    ],
    lineHeight: 16,
    align: "center",
    whiteSpace: "collapse",
  });
  const input = flow([{ type: "paragraph", paragraph: p }], { width: 80, height: 32 });
  const original = measureText({ kind: "rich", width: 80, paragraphs: [p] }, options);
  const result = layoutFlow(input, options);
  const nodes = result.document.pages.flatMap((page) => page.children);
  assert.equal(nodes.length, original.lines.length);
  nodes.forEach((node, i) => {
    assert.equal(node.type, "richText");
    if (node.type !== "richText") return;
    const measured = measureText({ kind: "rich", width: node.width, paragraphs: node.paragraphs }, options).lines[0];
    const line = original.lines[i];
    assert.ok(measured && line);
    assert.ok(Math.abs(measured.baseline - (line.baseline - line.top)) < 1e-12);
    assert.deepEqual(
      measured.fragments.map(({ text, style, x, advance }) => ({ text, style, x, advance })),
      line.fragments.map(({ text, style, x, advance }) => ({ text, style, x, advance })),
    );
  });
  assert.deepEqual(render(result.document, options), render(lower(h(Flow.Document, input), options), options));
});
test("unknown layouts never accept external plans or forged native nodes; caller source remains independent", () => {
  const source = { ...paragraph("A"), runs: [{ text: "A" }] };
  const input = flow([{ type: "paragraph", paragraph: source }]);
  const result = layoutFlow(input);
  const bytes = render(result.document);
  source.runs[0]!.text = "B";
  assert.deepEqual(render(result.document), bytes);
  assert.throws(() => layoutFlowUnknown(result), DocumentError);
  assert.throws(() => layoutFlowUnknown(flow([{ type: "fixed", height: 10, children: [] }]).body), DocumentError);
  assert.throws(
    () =>
      layoutFlowUnknown({
        ...input,
        body: [{ type: "fixed", height: 10, children: [h("rect", { x: 0, y: 0, width: 1, height: 1 })] }],
      }),
    DocumentError,
  );
});
test("derived width capacity never weakens left-edge prepared glyph ink checks", async () => {
  const font = await fixtureFont();
  const glyph = font.metadata.glyphs.find((item) => item.codePoint === 65);
  assert.ok(glyph);
  const overhang = createPreparedFont({
    ...(await fontInput()),
    glyphs: [{ ...glyph, bounds: [-100, glyph.bounds[1], glyph.bounds[2], glyph.bounds[3]] }],
  });
  const input = flow(
    [
      {
        type: "paragraph",
        paragraph: paragraph("A", {
          defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] },
        }),
      },
    ],
    {
      width: 760.03,
      margins: { top: 0, right: 0, bottom: 0, left: 700 },
    },
  );
  const options = { resources: { Demo: overhang } };
  for (const run of [() => layoutFlow(input, options), () => lower(h(Flow.Document, input), options)]) {
    assert.throws(run, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "FONT_INK");
  }
});
