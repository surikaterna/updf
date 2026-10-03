import assert from "node:assert/strict";
import test from "node:test";
import { type DocumentDefinition, DocumentError, type RenderOptions, render, renderUnknown } from "@updf/core";
import { createPreparedFont } from "@updf/core/fonts";
import { measureText, measureTextUnknown, type RichTextInput } from "@updf/core/measurement";
import { h, lower } from "@updf/core/vdom";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";

function input(text: string, fontSize: number, lineHeight: number, width: number, height?: number): RichTextInput {
  return {
    kind: "rich",
    width,
    ...(height === undefined ? {} : { height }),
    paragraphs: [
      {
        defaultStyle: { font: "Helvetica", fontSize, color: [0, 0, 0] },
        runs: [{ text }],
        lineHeight,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  };
}
function document(value: RichTextInput): DocumentDefinition {
  const height = value.height ?? Math.max(1000, value.paragraphs[0]?.lineHeight ?? 0);
  return {
    version: 1,
    pages: [
      {
        width: Math.max(1000, value.width),
        height: Math.max(1000, height),
        children: [{ type: "richText", x: 0, y: 0, width: value.width, height, paragraphs: value.paragraphs }],
      },
    ],
  };
}
function tree(value: RichTextInput) {
  const page = document(value).pages[0];
  assert.ok(page);
  return h("document", {
    version: 1,
    children: h("page", {
      width: page.width,
      height: page.height,
      children: h("richText", {
        x: 0,
        y: 0,
        width: value.width,
        height: value.height ?? Math.max(1000, value.paragraphs[0]?.lineHeight ?? 0),
        paragraphs: value.paragraphs,
      }),
    }),
  });
}
function accepted(value: RichTextInput, lineCount: number, options: RenderOptions = {}) {
  const measured = measureText(value, options);
  assert.equal(measured.lineCount, lineCount);
  assert.deepEqual(measureTextUnknown(value, options), measured);
  const bytes = render(document(value), options);
  assert.deepEqual(renderUnknown(document(value), options), bytes);
  assert.deepEqual(render(lower(tree(value), options), options), bytes);
  return measured;
}
function rejected(value: RichTextInput, code: string, options: RenderOptions = {}): void {
  const operations = [
    () => measureText(value, options),
    () => measureTextUnknown(value, options),
    () => render(document(value), options),
    () => renderUnknown(document(value), options),
    () => lower(tree(value), options),
  ];
  for (const operation of operations)
    assert.throws(operation, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}

test("R1: 10.51-point Helvetica envelope fits across measurement/render/lower", () => {
  const measured = accepted(input("A", 10.51, 10.51, 100), 1);
  assert.equal(measured.consumedHeight, 10.51);
  rejected(input("A", 10.51, 10.51 * (1 - 4 * Number.EPSILON), 100), "GEOMETRY");
});

test("R1: three 10.3-point lines fit 30.9 height; real relative overflow still fails", () => {
  const value = input("A\nA\nA", 10, 10.3, 100, 30.9);
  const measured = accepted(value, 3);
  assert.ok(Math.abs(measured.consumedHeight - 30.9) <= 30.9 * 2 * Number.EPSILON);
  rejected({ ...value, height: 30.9 * (1 - 4 * Number.EPSILON) }, "VERTICAL_OVERFLOW");
  const paragraph = value.paragraphs[0];
  assert.ok(paragraph);
  accepted(
    { ...value, paragraphs: [paragraph, paragraph, paragraph].map((item) => ({ ...item, runs: [{ text: "A" }] })) },
    3,
  );
});

test("R1: nine As fit 60.03 in error and scalar modes, invariant across color/run segmentation", () => {
  const value = input("AAAAAAAAA", 10, 12, 60.03);
  const paragraph = value.paragraphs[0];
  assert.ok(paragraph);
  for (const breakLongWords of ["error", "codePoint"] as const) {
    const measured = accepted({ ...value, paragraphs: [{ ...paragraph, breakLongWords }] }, 1);
    assert.equal(measured.lines[0]?.advance, 60.03);
    const segmented = accepted(
      {
        ...value,
        paragraphs: [
          {
            ...paragraph,
            breakLongWords,
            runs: Array.from({ length: 9 }, (_, i) => ({ text: "A", style: { color: [i % 2, 0, 0] as const } })),
          },
        ],
      },
      1,
    );
    assert.equal(segmented.lines[0]?.advance, measured.lines[0]?.advance);
    assert.deepEqual(segmented.lines[0]?.inkBounds, measured.lines[0]?.inkBounds);
  }
  rejected({ ...value, width: 60.03 * (1 - 4 * Number.EPSILON) }, "TOKEN_OVERFLOW");
  const split = accepted(
    { ...value, width: 60.03 * (1 - 4 * Number.EPSILON), paragraphs: [{ ...paragraph, breakLongWords: "codePoint" }] },
    2,
  );
  assert.deepEqual(
    split.lines.map((line) => line.fragments.map((fragment) => fragment.text).join("")),
    ["AAAAAAAA", "A"],
  );
});

test("rich scalar and soft-wrap comparisons use the same narrow fit rule", () => {
  const tiny = input("A", 10, 12, 6.67);
  const paragraph = tiny.paragraphs[0];
  assert.ok(paragraph);
  accepted(tiny, 1);
  rejected(
    { ...tiny, width: 6.67 * (1 - 4 * Number.EPSILON), paragraphs: [{ ...paragraph, breakLongWords: "codePoint" }] },
    "TOKEN_OVERFLOW",
  );
  const spaced = input("A A", 10, 12, 16.12);
  const measured = accepted(spaced, 1);
  assert.equal(measured.lines[0]?.advance, 16.12);
  accepted({ ...spaced, width: 16.12 * (1 - 4 * Number.EPSILON) }, 2);
});

test("rich relative tolerances do not become absolute allowances at tiny or huge scales", () => {
  for (const scale of [1e-200, 1e200]) {
    const value = input("AAAAAAAAA", 10 * scale, 12 * scale, 60.03 * scale);
    accepted(value, 1);
    rejected({ ...value, width: value.width * (1 - 16 * Number.EPSILON) }, "TOKEN_OVERFLOW");
    const height = input("A\nA\nA", 10 * scale, 10.3 * scale, 100 * scale, 30.9 * scale);
    accepted(height, 3);
    rejected({ ...height, height: 30.9 * scale * (1 - 16 * Number.EPSILON) }, "VERTICAL_OVERFLOW");
  }
  rejected(input("AAAAAAAAA", 1e308, 1e308, 1e308), "TOKEN_OVERFLOW");
  rejected(input("A\nA", 1e308, 1e308, 1e308), "GEOMETRY");
  rejected(input("A", 10, 12, Infinity), "GEOMETRY");
  rejected(input("A", 10, 12, 100, Infinity), "GEOMETRY");
});

test("prepared rich envelopes reject ink just beyond relative roundoff", async () => {
  const data = await fontInput();
  const original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((item) => item.codePoint === 65);
  assert.ok(glyph);
  const font = createPreparedFont({ ...data, glyphs: [{ ...glyph, bounds: [0, -500, 500, 1700] }] });
  const options = { resources: { Demo: font } };
  const lineHeight = (2200 * 10) / font.metadata.unitsPerEm;
  const value = input("A", 10, lineHeight, 100);
  const paragraph = value.paragraphs[0];
  assert.ok(paragraph);
  const selected: RichTextInput = {
    ...value,
    paragraphs: [{ ...paragraph, defaultStyle: { ...paragraph.defaultStyle, font: "Demo" } }],
  };
  accepted(selected, 1, options);
  rejected(
    {
      ...selected,
      paragraphs: [
        {
          ...paragraph,
          defaultStyle: { ...paragraph.defaultStyle, font: "Demo" },
          lineHeight: lineHeight * (1 - 4 * Number.EPSILON),
        },
      ],
    },
    "FONT_INK",
    options,
  );
});

test("zero-edge rich ink uses positioning scale and rejects overhang beyond roundoff even in huge boxes", async () => {
  const data = await fontInput();
  const glyph = createPreparedFont(data).metadata.glyphs.find((item) => item.codePoint === 65);
  assert.ok(glyph);
  const font = createPreparedFont({ ...data, glyphs: [{ ...glyph, bounds: [-1, -500, 500, 1700] }] });
  const options = { resources: { Demo: font } };
  const value = input("A", 10, 20, 100);
  const paragraph = value.paragraphs[0];
  assert.ok(paragraph);
  const selected: RichTextInput = {
    ...value,
    paragraphs: [{ ...paragraph, defaultStyle: { ...paragraph.defaultStyle, font: "Demo" } }],
  };
  rejected(selected, "FONT_INK", options);
  rejected({ ...selected, width: 1e200 }, "FONT_INK", options);
  const width = ((glyph.advance + 2) * 10) / font.metadata.unitsPerEm;
  const centered: RichTextInput = {
    ...selected,
    width,
    paragraphs: [{ ...paragraph, align: "center", defaultStyle: { ...paragraph.defaultStyle, font: "Demo" } }],
  };
  accepted(centered, 1, options);
  rejected({ ...centered, width: width - 8 * Number.EPSILON * 10 }, "FONT_INK", options);
});
