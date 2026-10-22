import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createPreparedFont } from "@updf/fonts";
import { measureText, type RichTextInput } from "@updf/text";
import { fixtureFont, fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontMeasurementOptions, fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { rectangular, rectangularCases } from "../../../tests/fixtures/text-flow/rectangular.js";

// Existing-owner oracle only: there is no new composer to compare in this slice.
function oracle(value: RichTextInput, resources: Awaited<ReturnType<typeof resourcesForOracle>>) {
  const options = fontMeasurementOptions({ resources });
  const measured = measureText(value, options);
  assert.deepEqual(measureText(value, options), measured);
  const document = {
    version: 1,
    pages: [
      {
        width: 200,
        height: 300,
        children: [
          {
            type: "richText",
            x: 10,
            y: 10,
            ...value,
            height: measured.consumedHeight,
          },
        ],
      },
    ],
  } as const;
  const rendering = fontOptions({ resources });
  const bytes = render(document, rendering);
  assert.deepEqual(render(document, rendering), bytes);
  const extracted = execFileSync("pdftotext", ["-raw", "-", "-"], { input: bytes, encoding: "utf8" });
  const expected = measured.lines.flatMap((line) => line.fragments.map((fragment) => fragment.text)).join("");
  assert.equal(extracted.replace(/\s/gu, ""), expected.replace(/\s/gu, ""));
  assert.equal(measured.consumedHeight, measured.lineCount * value.paragraphs[0]!.lineHeight);
  inspectReports(value, measured);
}

function inspectReports(value: RichTextInput, measured: ReturnType<typeof measureText>) {
  for (const line of measured.lines) {
    assert.ok(Number.isFinite(line.baseline));
    for (const fragment of line.fragments) {
      const source = value.paragraphs[line.paragraphIndex]!.runs[fragment.runIndex]!;
      assert.ok(fragment.source.start >= 0 && fragment.source.end <= source.text.length);
      if (value.paragraphs[0]!.whiteSpace === "preserve")
        assert.equal(fragment.text, source.text.slice(fragment.source.start, fragment.source.end));
      assert.ok(Number.isFinite(fragment.x));
    }
    if (!line.inkBounds.empty) {
      assert.ok(line.inkBounds.left >= 0);
      assert.ok(line.inkBounds.right <= value.width);
    }
  }
}

async function resourcesForOracle() {
  return { Demo: await fixtureFont() };
}

test("existing-owner rectangular oracle: Helvetica/prepared font, policies, mixed styles, reports and native extraction", async () => {
  const resources = await resourcesForOracle();
  for (const font of ["Helvetica", "Demo"])
    for (const value of Object.values(rectangularCases(font))) oracle(value, resources);
});

test("existing-owner source attribution and exact baseline/coordinates remain an explicit rectangular oracle", () => {
  const value = rectangular("AB\n", {}, 20);
  const measured = measureText(value, fontMeasurementOptions());
  assert.deepEqual(
    measured.lines.map((line) => [line.baseline, line.breakReason]),
    [
      [10.75, "hard"],
      [26.75, "paragraphEnd"],
    ],
  );
  assert.equal(measured.lines[0]?.fragments[0]?.x, 0);
  assert.deepEqual(measured.lines[0]?.fragments[0]?.source, { start: 0, end: 2 });
  const bytes = render(
    {
      version: 1,
      pages: [
        {
          width: 200,
          height: 300,
          children: [
            {
              type: "richText",
              x: 10,
              y: 10,
              ...value,
              height: measured.consumedHeight,
            },
          ],
        },
      ],
    },
    fontOptions(),
  );
  assert.match(new TextDecoder().decode(bytes), /1 0 0 1 10 279\.25 Tm/u);
  for (const text of ["unbreakable", "\t"]) {
    assert.throws(
      () => measureText(rectangular(text, {}, 1), fontMeasurementOptions()),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === (text === "\t" ? "CHARACTER" : "TOKEN_OVERFLOW") &&
        error.diagnostics[0]?.path === "/paragraphs/0/runs/0/text",
    );
  }
});

test("existing prepared-font ink overhang, not advance alone, controls the rectangular boundary", async () => {
  const data = await fontInput();
  const original = createPreparedFont(data);
  const glyph = original.metadata.glyphs.find((entry) => entry.codePoint === 65)!;
  const Demo = createPreparedFont({ ...data, glyphs: [{ ...glyph, advance: 600, bounds: [-100, -100, 800, 700] }] });
  const scale = 10 / Demo.metadata.unitsPerEm;
  const value = rectangular(
    "AA",
    { defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 0] }, breakLongWords: "codePoint" },
    1000 * scale,
  );
  const measured = measureText(value, fontMeasurementOptions({ resources: { Demo } }));
  assert.equal(measured.lineCount, 2);
  assert.equal(measured.lines[0]?.fragments[0]?.x, 100 * scale);
  oracle(value, { Demo });
});
