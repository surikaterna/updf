import assert from "node:assert/strict";
import test from "node:test";
import { createPreparedFont } from "@updf/fonts";
import { measureText, type RichTextInput } from "@updf/text";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontMeasurementOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { freightFonts } from "../../../tests/fixtures/fonts/freight-fonts.js";

function input(text: string, width: number, align: "left" | "center" | "right" = "left"): RichTextInput {
  return {
    width,
    paragraphs: [
      {
        defaultStyle: { font: "Demo", fontSize: 9, color: [0, 0, 0] },
        runs: [{ text }],
        lineHeight: 14,
        align,
        whiteSpace: "preserve",
        breakLongWords: "codePoint",
      },
    ],
  };
}

test("real freight text fits nearby widths with all characters and ink preserved in every alignment", async () => {
  const resources = await freightFonts();
  const options = fontMeasurementOptions({ resources: { Demo: resources.FreightRegular! } });
  const text = "Goods: reusable exhibition display crates with refrigeration monitoring and protective handling";
  for (const align of ["left", "center", "right"] as const) {
    for (let width = 160; width <= 195; width += 0.25) {
      const measured = measureText(input(text, width, align), options);
      assert.equal(measured.lines.flatMap((l) => l.fragments.map((f) => f.text)).join(""), text);
      for (const line of measured.lines) {
        assert.ok(!line.inkBounds.empty);
        assert.ok(line.inkBounds.left >= -1e-12 && line.inkBounds.right <= width + 1e-12);
      }
    }
  }
});

async function overhangFont() {
  const data = await fontInput();
  const original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((item) => item.codePoint === 65)!;
  const font = createPreparedFont({ ...data, glyphs: [{ ...glyph, advance: 600, bounds: [-100, -100, 800, 700] }] });
  return { options: fontMeasurementOptions({ resources: { Demo: font } }), scale: 9 / font.metadata.unitsPerEm };
}

test("token splitting includes both bearings; an indivisible ink envelope still rejects", async () => {
  const { options, scale } = await overhangFont();
  const width = 1000 * scale;
  const measured = measureText(input("AA", width), options);
  assert.equal(measured.lineCount, 2, "Advances alone would fit a different boundary");
  for (const line of measured.lines) {
    assert.equal(line.fragments[0]?.x, 100 * scale);
    assert.ok(!line.inkBounds.empty && line.inkBounds.left === 0 && line.inkBounds.right <= width);
  }
  assert.throws(() => measureText(input("A", 899 * scale), options), /scalar exceeds rich text width/u);
  const value = input("AA", width);
  assert.throws(
    () => measureText({ ...value, paragraphs: [{ ...value.paragraphs[0]!, breakLongWords: "error" }] }, options),
    /token exceeds rich text width/u,
  );
});

test("ordinary advance alignment remains stable and grouping does not change wrapping", async () => {
  const resources = await freightFonts();
  const options = fontMeasurementOptions({ resources: { Demo: resources.FreightRegular! } });
  for (const align of ["left", "center", "right"] as const) {
    const value = input("with wide words", 80, align);
    const plain = measureText(value, options);
    const split = measureText(
      { ...value, paragraphs: [{ ...value.paragraphs[0]!, runs: [..."with wide words"].map((text) => ({ text })) }] },
      options,
    );
    assert.deepEqual(
      split.lines.map((l) => [l.advance, l.inkBounds]),
      plain.lines.map((l) => [l.advance, l.inkBounds]),
    );
  }
});
