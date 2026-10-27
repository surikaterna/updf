import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

test("nonthrowing width probe only reports first-unit width blockage and never advances source", () => {
  const operation = createLayoutOperation(compositionOptions());
  try {
    const paragraph = rectangular("indivisible word").paragraphs[0]!;
    const source = operation.prepareInline(paragraph, () => [], 160, false);
    const position = operation.inlinePosition(source);
    assert.equal(operation.canSelectInline(source, 1), false);
    assert.equal(operation.canSelectInline(source, 1), false);
    assert.equal(operation.canSelectInline(source, 160), true);
    assert.deepEqual(operation.inlinePosition(source), position);
    assert.equal(
      operation.selectedInline(operation.selectInline(source, { width: 160 })!).measured.line.fragments[0]!.text,
      "indivisible word",
    );
    for (const width of [0, -1, Infinity, NaN])
      assert.throws(() => operation.canSelectInline(source, width), DocumentError);
  } finally {
    operation.close();
  }
});
test("every repeated blocked probe consumes cumulative work and quota errors propagate", () => {
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 600 } });
  try {
    const source = operation.prepareInline(rectangular("indivisible").paragraphs[0]!, () => [], 160, false);
    let probes = 0;
    assert.throws(
      () => {
        for (;;) {
          assert.equal(operation.canSelectInline(source, 1), false);
          probes++;
        }
      },
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
    assert.ok(probes > 1 && probes < 600);
  } finally {
    operation.close();
  }
});
test("probe rejects cross-operation, copied sources and after-close use", () => {
  const a = createLayoutOperation(compositionOptions());
  const b = createLayoutOperation(compositionOptions());
  const source = a.prepareInline(rectangular("word").paragraphs[0]!, () => [], 160, false);
  try {
    assert.throws(() => b.canSelectInline(source, 160), DocumentError);
    assert.throws(() => a.canSelectInline({ ...source }, 160), DocumentError);
  } finally {
    a.close();
    b.close();
  }
  assert.throws(() => a.canSelectInline(source, 160), DocumentError);
});
