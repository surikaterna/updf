import assert from "node:assert/strict";
import test from "node:test";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import type { TextLineMeasurement } from "../src/types.js";

function enclosed(band: { top: number; bottom: number }, line: TextLineMeasurement, top: number) {
  assert.ok(band.top <= top);
  assert.ok(band.bottom >= top + line.height);
  if (line.inkBounds.empty) return;
  assert.ok(band.top <= top + line.inkBounds.top);
  assert.ok(band.bottom >= top + line.inkBounds.bottom);
}

test("side-path prerequisite: width-selected rich participants invalidate a nominal-height band", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    const paragraph = rectangular("", {
      runs: [{ text: "A " }, { text: "B" }],
      whiteSpace: "preserve",
    }).paragraphs[0]!;
    const source = operation.prepareInline(paragraph, () => [], 120, {
      strut: { unit: "pt", value: 16 },
      runs: [
        { unit: "pt", value: 16 },
        { unit: "pt", value: 80 },
      ],
    });
    const narrow = operation.selectedInline(operation.selectInline(source, { width: 12 })!);
    const wide = operation.selectedInline(operation.selectInline(source, { width: 120 })!);
    assert.equal(narrow.measured.line.height, 16);
    assert.equal(wide.measured.line.height, 80);
    assert.equal(narrow.measured.line.fragments.map((fragment) => fragment.text).join(""), "A ");
    assert.equal(wide.measured.line.fragments.map((fragment) => fragment.text).join(""), "A B");
    assert.ok(!wide.measured.line.inkBounds.empty);
    assert.ok(wide.measured.line.inkBounds.bottom > paragraph.lineHeight);
    for (const top of [0, 1e-300, 0.1, 1e20, 1e300]) {
      const band = operation.inlineBand(source, top);
      for (const { measured } of [narrow, wide]) enclosed(band, measured.line, top);
      assert.equal(band.nominalHeight, 16);
      assert.ok(band.nextTop > top);
    }
    assert.equal(operation.inlinePosition(source).offset, 0);
  } finally {
    operation.close();
  }
});
