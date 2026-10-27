import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { fontRuntime } from "@updf/fonts";
import { createTextComposition } from "@updf/text/composition";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";

test("bands share one prepared source across forks/resume without invoking visuals or consuming offsets", () => {
  const operation = createLayoutOperation(compositionOptions());
  let calls = 0;
  const paragraph = rectangular("A A B", { whiteSpace: "preserve" }).paragraphs[0]!;
  const height = { strut: { unit: "pt" as const, value: 4 } };
  const source = operation.prepareInline(
    paragraph,
    () => {
      calls++;
      return [];
    },
    120,
    height,
  );
  const band = operation.inlineBand(source, 0);
  height.strut.value = 80;
  const first = operation.selectedInline(operation.selectInline(source, { width: 12 })!);
  const resumed = operation.resumeInline(source, first.nextOffset);
  assert.deepEqual(operation.inlineBand(resumed, 0), band);
  assert.deepEqual(operation.inlineBand(first.continuation!, 0), band);
  assert.deepEqual(operation.inlineBand(source, 0), band);
  assert.equal(band.nominalHeight, 4);
  assert.equal(operation.inlinePosition(source).offset, 0);
  assert.equal(calls, 1);
  operation.close();
});

test("band ownership, active lifetime and exact top domains precede query work", () => {
  const a = createLayoutOperation(compositionOptions()),
    b = createLayoutOperation(compositionOptions());
  const source = a.prepareInline(rectangular("A").paragraphs[0]!, () => [], 120, true);
  assert.throws(() => b.inlineBand(source, 0), DocumentError);
  assert.throws(() => a.inlineBand({ ...source }, 0), DocumentError);
  for (const top of [-Number.MIN_VALUE, NaN, Infinity]) assert.throws(() => a.inlineBand(source, top), DocumentError);
  assert.ok(a.inlineBand(source, 1e300).nextTop > 1e300);
  assert.throws(() => a.inlineBand(source, Number.MAX_VALUE), DocumentError);
  a.close();
  b.close();
  assert.throws(() => a.inlineBand(source, 0), DocumentError);
});

test("band retries and failed attempts keep cumulative charges without resetting source state", () => {
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 600 } });
  const source = operation.prepareInline(rectangular("A A B").paragraphs[0]!, () => [], 120, true);
  let queries = 0;
  const limit = (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT";
  for (let i = 0; i < 10; i++) assert.throws(() => operation.inlineBand(source, Infinity), DocumentError);
  assert.throws(() => {
    for (;;) {
      operation.inlineBand(source, 0);
      queries++;
    }
  }, limit);
  assert.ok(queries > 1);
  assert.throws(() => operation.inlineBand(source, 0), limit);
  operation.close();
});

test("lazy certificate metric preparation is shared across resumed and selected continuations", () => {
  const base = fontRuntime();
  let metricCalls = 0,
    visuals = 0;
  const runtime = {
    ...base,
    lineMetrics(...args: Parameters<typeof base.lineMetrics>) {
      metricCalls++;
      return base.lineMetrics(...args);
    },
  };
  const operation = createLayoutOperation({ ...compositionOptions(), ...createTextComposition({ runtime }) });
  const paragraph = rectangular("A A B").paragraphs[0]!;
  const source = operation.prepareInline(
    paragraph,
    () => {
      visuals++;
      return [];
    },
    120,
    { strut: "normal" },
  );
  const before = metricCalls;
  operation.inlineBand(source, 0);
  assert.equal(metricCalls - before, 2);
  const resumed = operation.resumeInline(source, 0);
  const after = metricCalls;
  for (let i = 0; i < 10; i++) operation.inlineBand(resumed, i);
  assert.equal(metricCalls, after);
  assert.equal(visuals, 1);
  operation.close();
});

test("atomic visuals use paragraph default style for automatic height, not run override", () => {
  const operation = createLayoutOperation(compositionOptions());
  const paragraph = rectangular("", { runs: [{ text: "", style: { fontSize: 1000 } }] }).paragraphs[0]!;
  const metrics = { advance: 8, left: 0, right: 8, ascent: 2, descent: 1, top: -30, bottom: 20, empty: false };
  const source = operation.prepareInline(paragraph, () => [{ runIndex: 0, path: "/visual", metrics }], 120, true);
  const actual = operation.selectedInline(operation.selectInline(source, { width: 120 })!).measured.line;
  const band = operation.inlineBand(source, 0);
  assert.equal(actual.height, paragraph.lineHeight);
  assert.ok(band.bottom < 1000);
  assert.ok(!actual.inkBounds.empty);
  assert.ok(band.top <= actual.inkBounds.top && band.bottom >= actual.inkBounds.bottom);
  operation.close();
});

test("captured mixed-font sources enclose selected lines in every height mode and whitespace policy", async () => {
  const Demo = await fixtureFont();
  const operation = createLayoutOperation(compositionOptions({ Demo }));
  for (const whiteSpace of ["preserve", "collapse"] as const) {
    const paragraph = rectangular("", {
      whiteSpace,
      lineHeight: 40,
      runs: [{ text: "A A " }, { text: "B\n", style: { font: "Demo", fontSize: 20 } }, { text: "  " }],
    }).paragraphs[0]!;
    for (const height of [
      false,
      true,
      { strut: "normal" },
      { strut: 0.1 },
      { strut: { unit: "pt", value: 4 }, runs: ["normal", 0.2] },
    ] as const) {
      const source = operation.prepareInline(paragraph, () => [], 120, height);
      const band = operation.inlineBand(source, 0.1);
      const actual = operation.selectedInline(operation.selectInline(source, { width: 120 })!).measured.line;
      assert.ok(band.top <= 0.1 && band.bottom >= 0.1 + actual.height);
      if (actual.inkBounds.empty) continue;
      assert.ok(band.top <= 0.1 + actual.inkBounds.top);
      assert.ok(band.bottom >= 0.1 + actual.inkBounds.bottom);
    }
  }
  operation.close();
});
