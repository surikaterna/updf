import assert from "node:assert/strict";
import test from "node:test";
import { render, type NodeDefinition } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { createPreparedFont } from "@updf/fonts";
import { measureText, type RichTextInput } from "@updf/text";
import { fixtureFont, fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontMeasurementOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { compositionOptions } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular, rectangularCases } from "../../../tests/fixtures/text-flow/rectangular.js";

function parity(value: RichTextInput, Demo?: ReturnType<typeof createPreparedFont>) {
  const options = compositionOptions(Demo ? { Demo } : {});
  const operation = createLayoutOperation(options);
  try {
    const measured = measureText(value, fontMeasurementOptions({ resources: options.resources! }));
    const frame = operation.composeText(
      { width: value.width, maxHeight: 300, paragraphs: value.paragraphs },
      "/parity",
    );
    assert.deepEqual(frame.measurement, measured);
    assert.equal(frame.bands.length, measured.lineCount);
    const node = operation.composedText(frame, "/parity");
    const document = (node: NodeDefinition) =>
      ({ version: 1, pages: [{ width: 200, height: 300, children: [{ ...node, x: 10, y: 10 }] }] }) as const;
    const original: NodeDefinition = { type: "richText", x: 0, y: 0, ...value, height: measured.consumedHeight };
    assert.deepEqual(render(document(node), options), render(document(original), options));
    for (const band of frame.bands) {
      assert.ok(band.top >= 0);
      assert.ok(band.bottom <= frame.height);
    }
  } finally {
    operation.close();
  }
}
test("new composition reports and native PDF bytes match every existing rectangular fixture", async () => {
  const Demo = await fixtureFont();
  for (const font of ["Helvetica", "Demo"])
    for (const value of Object.values(rectangularCases(font))) parity(value, Demo);
});
test("prepared-font overhang and mixed fonts retain selected runs without remeasurement", async () => {
  const data = await fontInput();
  const original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((entry) => entry.codePoint === 65)!;
  const Demo = createPreparedFont({ ...data, glyphs: [{ ...glyph, advance: 600, bounds: [-100, -100, 800, 700] }] });
  const scale = 10 / Demo.metadata.unitsPerEm;
  parity(
    rectangular(
      "AA",
      { defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] }, breakLongWords: "codePoint" },
      1000 * scale,
    ),
    Demo,
  );
  parity(rectangular("", { runs: [{ text: "A", style: { font: "Demo" } }, { text: "B" }] }), Demo);
});
test("prepared native output paints after closure with no text service at all", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  const frame = operation.composeText({ ...rectangular("AB"), maxHeight: 100 }, "/prepared");
  const node = operation.composedText(frame, "/prepared");
  operation.close();
  const document = { version: 1, pages: [{ width: 100, height: 100, children: [node] }] } as const;
  const { text: _text, ...paintOnly } = options;
  assert.deepEqual(render(document, paintOnly), render(document, options));
});
