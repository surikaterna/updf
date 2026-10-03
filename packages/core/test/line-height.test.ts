import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createLayoutOperation, type InlineLineHeights, paintInlineText } from "@updf/core/internal";
import type { ParagraphDefinition } from "@updf/core/measurement";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";

function paragraph(size = 12, text = "A", nested?: number): ParagraphDefinition {
  return {
    defaultStyle: { font: "Helvetica", fontSize: size, color: [0, 0, 0] },
    runs: [{ text, ...(nested ? { style: { fontSize: nested } } : {}) }],
    lineHeight: 16,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
}
function measure(value: ParagraphDefinition, heights: InlineLineHeights) {
  return createLayoutOperation({}).measureInline(value, () => [], 200, heights, "/test");
}
test("raw inherited ratios and absolute lengths resolve per participant", () => {
  assert.ok(Math.abs(measure(paragraph(), { strut: 1.2 })[0]!.line.height - 14.4) < 1e-12);
  assert.equal(measure(paragraph(12, "A", 20), { strut: 1.2 })[0]!.line.height, 24);
  assert.equal(measure(paragraph(20), { strut: { unit: "pt", value: 16 } })[0]!.line.height, 16);
  // Both participants retain 16pt; their different baseline requirements widen the combined box.
  assert.equal(measure(paragraph(12, "A", 20), { strut: { unit: "pt", value: 16 } })[0]!.line.height, 18.2);
  assert.equal(measure(paragraph(12, "A", 20), { strut: 1.2, runs: ["normal"] })[0]!.line.height, 20);
});
test("normal preserves Helvetica's envelope and empty-line strut", () => {
  for (const text of ["", "A", "\n"]) {
    for (const { line } of measure(paragraph(12, text), { strut: "normal" })) assert.equal(line.height, 12);
  }
});
test("normal scales prepared descriptor units and combines mixed fonts", async () => {
  const font = await fixtureFont();
  assert.notEqual(font.metadata.unitsPerEm, 1000);
  const operation = createLayoutOperation({ resources: { Demo: font } });
  const value = { ...paragraph(), defaultStyle: { ...paragraph().defaultStyle, font: "Demo" } };
  const expected =
    ((font.metadata.descriptor.ascent - font.metadata.descriptor.descent) * 12) / font.metadata.unitsPerEm;
  const lines = operation.measureInline({ ...value, runs: [] }, () => [], 200, { strut: "normal" }, "/test");
  assert.ok(Math.abs(lines[0]!.line.height - expected) < 1e-12);
  const mixed = operation.measureInline(
    { ...value, runs: [{ text: "A", style: { font: "Helvetica", fontSize: 20 } }] },
    () => [],
    200,
    { strut: "normal" },
    "/test",
  );
  assert.ok(mixed[0]!.line.height >= 20);
});
test("tight line boxes retain overflowing ink and paint without a line clip", () => {
  const value = paragraph();
  const measured = measure(value, { strut: { unit: "pt", value: 4 } })[0]!;
  assert.equal(measured.line.height, 4);
  assert.ok(!measured.line.inkBounds.empty && measured.line.inkBounds.top < 0 && measured.line.inkBounds.bottom > 4);
  const nodes = paintInlineText(measured, value, 20, 20);
  assert.ok(nodes[0]?.type === "paintGroup" && nodes[0].clip === undefined);
  const operation = createLayoutOperation({});
  const ink = operation.nativeInk(nodes);
  assert.ok(!ink.empty && ink.top < 20 && ink.bottom > 24);
  assert.ok(render({ version: 1, pages: [{ width: 240, height: 100, children: nodes }] }).length > 0);
  assert.throws(() => render({ version: 1, pages: [{ width: 240, height: 24, children: nodes }] }));
  const clipped = {
    type: "paintGroup" as const,
    clip: { x: 0, y: 0, width: 200, height: 4 },
    children: paintInlineText(measured, value, 0, 0),
  };
  const clippedInk = operation.nativeInk([clipped]);
  assert.ok(!clippedInk.empty && clippedInk.top >= 0 && clippedInk.bottom <= 4);
  assert.throws(() =>
    operation.measureText({ kind: "rich", width: 200, paragraphs: [{ ...value, lineHeight: 4 }] }, "/fixed"),
  );
});
test("inline visuals contribute declared ascent and descent", () => {
  const operation = createLayoutOperation({});
  const metrics = { advance: 10, left: 0, right: 10, ascent: 25, descent: 7, top: -25, bottom: 7, empty: false };
  const lines = operation.measureInline(
    paragraph(12, ""),
    () => [{ runIndex: 0, path: "/visual", metrics }],
    200,
    { strut: 1.2 },
    "/test",
  );
  assert.equal(lines[0]!.line.height, 32);
  assert.equal(lines[0]!.line.baseline, 25);
});
test("zero, negative and nonfinite line heights are rejected", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => measure(paragraph(), { strut: value }));
    assert.throws(() => measure(paragraph(), { strut: { unit: "pt", value } }));
  }
});
test("tiny positive line heights survive baseline-edge cancellation", () => {
  for (const height of [1e-16, Number.MIN_VALUE]) {
    for (const text of ["A", "", "\n"]) {
      const lines = measure(paragraph(12, text), { strut: { unit: "pt", value: height } });
      for (const { line } of lines) {
        assert.equal(line.height, height);
        assert.ok(Number.isFinite(line.baseline));
        assertTinyInk(line);
      }
    }
  }
});
function assertTinyInk(line: ReturnType<typeof measure>[number]["line"]): void {
  if (line.inkBounds.empty) return;
  assert.equal(line.inkBounds.top, line.baseline - 12 * 0.775);
  assert.ok(line.inkBounds.bottom > line.top + line.height);
}
function geometryFailure(operation: () => unknown): void {
  assert.throws(
    operation,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === "GEOMETRY" &&
      error.diagnostics[0]?.path === "/test",
  );
}
test("prepared descriptor intermediate overflow is a structured geometry failure", async () => {
  const font = await fixtureFont();
  const operation = createLayoutOperation({ resources: { Demo: font } });
  const value = {
    ...paragraph(Number.MAX_VALUE),
    defaultStyle: { ...paragraph(Number.MAX_VALUE).defaultStyle, font: "Demo" },
    lineHeight: Number.MAX_VALUE,
    runs: [],
  };
  for (const strut of [1, { unit: "pt" as const, value: 16 }, "normal" as const])
    geometryFailure(() => operation.measureInline(value, () => [], 200, { strut }, "/test"));
});
test("finite participant heights reject overflowing or unrepresentable final positions", () => {
  geometryFailure(() => measure(paragraph(12, "\n"), { strut: { unit: "pt", value: Number.MAX_VALUE } }));
  geometryFailure(() =>
    measure(
      { ...paragraph(), runs: [{ text: "A\n" }, { text: "A" }] },
      {
        strut: { unit: "pt", value: 1e-16 },
        runs: [
          { unit: "pt", value: Number.MAX_VALUE },
          { unit: "pt", value: 1e-16 },
        ],
      },
    ),
  );
});
