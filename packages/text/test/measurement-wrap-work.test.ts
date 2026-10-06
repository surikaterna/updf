import assert from "node:assert/strict";
import test from "node:test";
import { renderUnknown } from "@updf/core";
import { measureText, type ParagraphDefinition } from "@updf/text";
import { fontMeasurementOptions, fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { ledger } from "../src/ledger.js";
import { type Atom, wrap } from "../src/wrap.js";

function paragraph(text: string, split = false): ParagraphDefinition {
  return {
    runs: [{ text }],
    defaultStyle: { font: "Helvetica", fontSize: 0.01, color: [0, 0, 0] },
    lineHeight: 1,
    align: "left",
    whiteSpace: "collapse",
    breakLongWords: split ? "codePoint" : "error",
  };
}

function countedAtoms(text: string): { atoms: Atom[]; reads: () => number } {
  let reads = 0;
  const style = paragraph("").defaultStyle;
  const atoms = Array.from(
    text,
    (text, start): Atom => ({
      text,
      start,
      end: start + 1,
      runIndex: 0,
      style,
      path: "/paragraphs/0/runs/0/text",
      metrics: {
        get advance() {
          reads++;
          return 1;
        },
        left: 0,
        right: 1,
        ascent: 1,
        descent: 0,
        top: -1,
        bottom: 0,
        empty: text === " ",
      },
    }),
  );
  return { atoms, reads: () => reads };
}

test("many short words use linear metric reads on growing and wrapping lines", () => {
  for (const size of [1024, 4096]) {
    const text = "a ".repeat(size);
    for (const width of [text.length, 127]) {
      const input = countedAtoms(text);
      const lines = wrap(input.atoms, width, paragraph(text), ledger(), "");
      assert.ok(input.reads() <= 5 * text.length, `${input.reads()} metric reads for ${text.length} atoms`);
      assert.equal(lines.map((line) => line.atoms.map((atom) => atom.text).join("")).join(" "), text.trim());
      assert.ok(lines.every((line) => line.atoms.length <= width));
      for (const atom of lines.flatMap((line) => line.atoms)) assert.equal(atom, input.atoms[atom.start]);
    }
  }
});

test("scalar splitting uses linear metric reads even with large chunks", () => {
  for (const size of [2048, 8192]) {
    const text = "a".repeat(size);
    const input = countedAtoms(text);
    const lines = wrap(input.atoms, size / 2, paragraph(text, true), ledger(), "");
    assert.ok(input.reads() <= 5 * size, `${input.reads()} metric reads for ${size} atoms`);
    assert.deepEqual(
      lines.map((line) => line.atoms.length),
      [size / 2, size / 2],
    );
    assert.deepEqual(
      lines.flatMap((line) => line.atoms),
      input.atoms,
    );
    assert.deepEqual(
      lines.map((line) => line.breakReason),
      ["soft", "paragraphEnd"],
    );
  }
});

test("service rendering retains large short-word lines and scalar-split tokens", () => {
  for (const split of [false, true]) {
    const text = split ? "a".repeat(32000) : "a ".repeat(16000);
    const p = paragraph(text, split);
    const width = split ? 60 : 600;
    const measured = measureText(
      { kind: "rich", width, paragraphs: [p] },
      fontMeasurementOptions({ profile: "service" }),
    );
    assert.equal(measured.lineCount, split ? 3 : 1);
    assert.equal(
      measured.lines.flatMap((line) => line.fragments.map((fragment) => fragment.text)).join(""),
      text.trim(),
    );
    const bytes = renderUnknown(
      {
        version: 1,
        pages: [
          { width: 612, height: 792, children: [{ type: "richText", x: 0, y: 0, width, height: 10, paragraphs: [p] }] },
        ],
      },
      fontOptions({ profile: "service" }),
    );
    const pdf = new TextDecoder().decode(bytes);
    assert.match(pdf, /^%PDF-/);
    assert.equal((pdf.match(/ Tj/g) ?? []).length, measured.lineCount);
    assert.equal(bytes.length, split ? 32759 : 32646);
  }
});
