import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import type { CompositionInput, RectangularExclusion, TextExclusion } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { excluded } from "../../../tests/fixtures/text-flow/exclusion.js";

const rect: RectangularExclusion = { shape: "rect", side: "left", width: 20, height: 32 };
function compose(text: string, exclusion: TextExclusion = rect, width = 60, maxHeight = 1000) {
  const operation = createLayoutOperation(compositionOptions());
  try {
    return operation.composeText({ ...rectangular(text, {}, width), exclusion, maxHeight });
  } finally {
    operation.close();
  }
}
function rejects(input: CompositionInput, code: string) {
  const operation = createLayoutOperation(compositionOptions());
  try {
    assert.throws(
      () => operation.composeText(input),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code,
    );
  } finally {
    operation.close();
  }
}
test("edge reservations use whole occupied bands, restore full width, and retain source offsets", () => {
  for (const side of ["left", "right"] as const) {
    const input = excluded(side);
    const frame = compose(input.paragraphs[0]!.runs[0]!.text, input.exclusion);
    assert.ok(frame.measurement.lineCount > 2);
    for (const line of frame.measurement.lines) {
      const f = line.fragments[0]!;
      if (line.top < 32) assert.equal(f.x, side === "left" ? 20 : 0);
      else assert.equal(f.x, 0);
      const ink = line.inkBounds;
      if (!ink.empty && line.top < 32) {
        assert.ok(side === "left" ? ink.left >= 20 : ink.right <= 40);
      }
      assert.ok(f.source.start < f.source.end);
    }
    assert.equal(frame.height, frame.measurement.lineCount * 16);
  }
});
test("a nonzero top intersecting the band narrows even with baseline outside; exact touching is disjoint", () => {
  const touching = compose("AB CD EF GH", { ...rect, top: 16, height: 16 });
  assert.equal(touching.measurement.lines[0]?.fragments[0]?.x, 0);
  const crossing = compose("AB CD EF GH", { ...rect, top: 14, height: 2 });
  assert.ok(crossing.measurement.lines[0]!.baseline < 14);
  assert.equal(crossing.measurement.lines[0]?.fragments[0]?.x, 20);
});
test("full width and indivisible narrow overflow jump without source consumption or trailing reservation", () => {
  for (const exclusion of [
    { ...rect, width: 60, height: 1e12 },
    { ...rect, width: 59, height: 1e12 },
  ]) {
    const frame = compose("AB CD", exclusion, 60, 1e12 + 16);
    assert.equal(frame.height, 1e12 + 16);
    assert.equal(frame.measurement.lines[0]?.top, 1e12);
    assert.equal(frame.measurement.lines[0]?.fragments[0]?.text, "AB CD");
    assert.deepEqual(frame.measurement.lines[0]?.fragments[0]?.source, { start: 0, end: 5 });
  }
  assert.equal(compose("AB", { ...rect, top: 16, height: 1e12, width: 60 }).height, 16);
  assert.equal(compose("AB", { ...rect, top: 100, height: 1e12 }).height, 16);
});
test("empty input reserves nothing, empty paragraphs/newlines retain ordinary semantics", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    assert.equal(operation.composeText({ width: 60, maxHeight: 0, paragraphs: [], exclusion: rect }).height, 0);
  } finally {
    operation.close();
  }
  for (const text of ["", "\n", "\n\n", "AB\n\n"]) {
    const frame = compose(text, { ...rect, top: 100 });
    assert.equal(frame.measurement.lineCount, text.split("\n").length);
    assert.equal(frame.measurement.lines.at(-1)?.breakReason, "paragraphEnd");
  }
});
test("exact domains, overflow, no-progress and full-frame token errors remain enforced", () => {
  const input = { ...rectangular("AB", {}, 60), maxHeight: 100, exclusion: rect };
  for (const width of [0, -1, NaN, Infinity]) rejects({ ...input, exclusion: { ...rect, width } }, "GEOMETRY");
  for (const height of [0, -1, NaN, Infinity]) rejects({ ...input, exclusion: { ...rect, height } }, "GEOMETRY");
  for (const top of [-Number.MIN_VALUE, NaN, Infinity]) rejects({ ...input, exclusion: { ...rect, top } }, "GEOMETRY");
  rejects({ ...input, exclusion: { ...rect, width: 60 + 1e-12 } }, "GEOMETRY");
  rejects({ ...input, exclusion: { ...rect, top: 1e300, height: 1 } }, "GEOMETRY");
  rejects({ ...input, exclusion: { ...rect, top: 1e308, height: 1e308 } }, "GEOMETRY");
  rejects({ ...input, width: 1 }, "GEOMETRY");
  rejects({ ...input, width: 1, exclusion: { ...rect, width: 1 } }, "TOKEN_OVERFLOW");
  assert.equal(compose("AB", rect, 60, 16).height, 16);
  rejects({ ...input, maxHeight: 16 - 1e-10 }, "VERTICAL_OVERFLOW");
  assert.equal(compose("AB", { ...rect, width: Number.MIN_VALUE, height: Number.MIN_VALUE }).height, 16);
});
test("exclusion output is durable selected native text with unchanged operation lifecycle", () => {
  const options = compositionOptions();
  const operation = createLayoutOperation(options);
  const frame = operation.composeText({ ...rectangular("AB CD EF", {}, 60), exclusion: rect, maxHeight: 100 });
  const node = operation.composedText(frame);
  operation.close();
  const document = { version: 1, pages: [{ width: 100, height: 100, children: [node] }] } as const;
  const { text: _text, ...paintOnly } = options;
  assert.deepEqual(render(document, paintOnly), render(document, options));
  assert.throws(() => operation.composedText(frame), DocumentError);
});
