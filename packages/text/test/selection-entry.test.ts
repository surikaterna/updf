import assert from "node:assert/strict";
import test from "node:test";
import { createLayoutOperation } from "@updf/core/internal";
import { useOperationCapability } from "@updf/core/resources";
import { DocumentError } from "@updf/core";
import { createTextSelection } from "@updf/text/selection";
import { createTextComposition, type TextCompositionOperation } from "@updf/text/composition";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

function operation(combined: boolean) {
  const runtime = fontRuntime();
  const service = (combined ? createTextComposition : createTextSelection)({ runtime, defaultFont: "Helvetica" });
  const operation = createLayoutOperation({
    ...service,
    resources: { Helvetica: createHelvetica() },
    providers: [fontProvider(runtime)],
    limits: { nodes: 900 },
  });
  return { operation, selected: useOperationCapability(operation, service.capability) };
}
test("selection-only and combined entries share inline results, cumulative quota and lifecycle semantics", () => {
  const results = [];
  for (const combined of [false, true]) {
    const { operation: op, selected: s } = operation(combined);
    const source = s.prepareInline(rectangular("A A B").paragraphs[0]!, () => [], 120, true);
    const first = s.selectedInline(s.selectInline(source, { width: 12 })!);
    const resumed = s.resumeInline(source, first.nextOffset);
    assert.deepEqual(s.inlineBand(source, 0), s.inlineBand(resumed, 0));
    assert.throws(() => s.inlineBand({ ...source }, 0), DocumentError);
    for (const top of [-Number.MIN_VALUE, Infinity, NaN]) assert.throws(() => s.inlineBand(source, top), DocumentError);
    let queries = 0;
    assert.throws(() => {
      for (;;) {
        s.inlineBand(source, 0);
        queries++;
      }
    }, /Composition work/u);
    results.push({ measured: first.measured, nextOffset: first.nextOffset, queries });
    op.close();
    assert.throws(() => s.inlineBand(source, 0), DocumentError);
  }
  assert.deepEqual(results[0], results[1]);
});
test("combined composition and inline selection debit one counter, not independent allowances", () => {
  const counts = [];
  for (const composeFirst of [false, true]) {
    const { operation: op, selected: s } = operation(true);
    if (composeFirst) (s as typeof s & TextCompositionOperation).composeText({ ...rectangular("A"), maxHeight: 100 });
    const source = s.prepareInline(rectangular("A A B").paragraphs[0]!, () => [], 120, true);
    let queries = 0;
    assert.throws(() => {
      for (;;) {
        s.inlineBand(source, 0);
        queries++;
      }
    }, /Composition work/u);
    counts.push(queries);
    op.close();
  }
  assert.ok(counts[1]! > 0 && counts[1]! < counts[0]!);
});
