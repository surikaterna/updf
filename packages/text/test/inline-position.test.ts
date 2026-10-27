import assert from "node:assert/strict";
import test from "node:test";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

test("source extents count retained scalar, break and terminal units independently of widths or UTF16", () => {
  const operation = createLayoutOperation(compositionOptions());
  for (const [text, whiteSpace, extent] of [
    ["", "collapse", 1],
    ["   ", "collapse", 1],
    ["   ", "preserve", 4],
    ["  a  b  ", "collapse", 4],
    ["ab\n\n", "preserve", 5],
  ] as const) {
    const paragraph = rectangular(text, { whiteSpace, breakLongWords: "codePoint" }).paragraphs[0]!;
    const source = operation.prepareInline(paragraph, () => [], 120, false);
    assert.deepEqual(operation.inlinePosition(source), { offset: 0, extent });
    const selected = operation.selectedInline(operation.selectInline(source, { width: 120 })!);
    assert.equal(selected.startOffset, 0);
    const resumed = operation.resumeInline(source, selected.nextOffset);
    assert.equal(operation.inlinePosition(resumed).offset, selected.nextOffset);
    const terminal = operation.resumeInline(source, extent);
    assert.equal(operation.selectInline(terminal, { width: 120 }), undefined);
    assert.equal(operation.inlinePosition(source).offset, 0);
  }
  operation.close();
});

test("source resume resets width caches and never replays earlier lines or changes source reports", () => {
  const operation = createLayoutOperation(compositionOptions());
  const paragraph = rectangular("abcdefghijk", { breakLongWords: "codePoint" }).paragraphs[0]!;
  const source = operation.prepareInline(paragraph, () => [], 120, false);
  const first = operation.selectedInline(operation.selectInline(source, { width: 24 })!);
  assert.ok(first.continuation);
  const resumed = operation.resumeInline(source, first.nextOffset);
  const tail = operation.selectedInline(operation.selectInline(resumed, { width: 120 })!);
  const direct = operation.selectedInline(operation.selectInline(first.continuation, { width: 120 })!);
  assert.deepEqual(tail, direct);
  assert.equal(tail.startOffset, first.nextOffset);
  assert.equal(tail.nextOffset, operation.inlinePosition(source).extent);
  assert.equal(tail.measured.line.fragments[0]!.source.start, first.nextOffset);
  assert.equal(tail.continuation, undefined);
  operation.close();
});

test("resume enforces exact cursor domains, indivisible tokens and operation ownership", () => {
  const a = createLayoutOperation(compositionOptions());
  const b = createLayoutOperation(compositionOptions());
  const paragraph = rectangular("abcd ef").paragraphs[0]!;
  const source = a.prepareInline(paragraph, () => [], 120, false);
  for (const offset of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, 1, 3])
    assert.throws(() => a.resumeInline(source, offset));
  assert.equal(a.inlinePosition(a.resumeInline(source, 4)).offset, 4);
  assert.throws(() => a.inlinePosition({ ...source }));
  assert.throws(() => b.resumeInline(source, 0));
  assert.throws(() => b.inlinePosition(source));
  assert.throws(() => a.selectInline(source, { width: 120, maxHeight: undefined } as never));
  a.close();
  b.close();
  assert.throws(() => a.resumeInline(source, 0));
  assert.throws(() => a.inlinePosition(source));
});
