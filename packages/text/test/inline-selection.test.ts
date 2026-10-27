import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const paragraph = () => rectangular("AB CD EF GH IJ", { whiteSpace: "preserve" }).paragraphs[0]!;
test("owned rich inline positions reflow a reduced-width prefix into a full-width tail without consuming rejected queries", () => {
  const operation = createLayoutOperation(compositionOptions());
  let preparations = 0;
  const source = operation.prepareInline(
    paragraph(),
    () => {
      preparations++;
      return [];
    },
    120,
    false,
    "/rich",
  );
  const request = { width: 24, maxHeight: 16 };
  assert.equal(operation.selectInline(source, { ...request, maxHeight: 0 }), undefined);
  const first = operation.selectedInline(operation.selectInline(source, request)!);
  assert.ok(first.continuation);
  assert.deepEqual(operation.selectedInline(operation.selectInline(source, request)!), first);
  assert.equal(first.measured.line.fragments.map((f) => f.text).join(""), "AB ");
  const tail = operation.selectedInline(operation.selectInline(first.continuation, { width: 120, maxHeight: 16 })!);
  assert.equal(tail.measured.line.fragments.map((f) => f.text).join(""), "CD EF GH IJ");
  assert.equal(tail.continuation, undefined);
  assert.equal(tail.measured.line.fragments[0]!.source.start, 3);
  assert.equal(preparations, 1);
  operation.close();
});
test("source and selected handles reject across operations, clones and closed lifetimes", () => {
  const a = createLayoutOperation(compositionOptions()),
    b = createLayoutOperation(compositionOptions());
  const source = a.prepareInline(paragraph(), () => [], 120, false);
  const request = { width: 120, maxHeight: 100 };
  const selected = a.selectInline(source, request)!;
  const rejects = (invoke: () => unknown) =>
    assert.throws(
      invoke,
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
    );
  rejects(() => b.selectInline(source, request));
  rejects(() => a.selectInline({ ...source }, request));
  rejects(() => b.selectedInline(selected));
  rejects(() => a.selectedInline({ ...selected }));
  a.close();
  b.close();
  rejects(() => a.selectInline(source, request));
  rejects(() => a.selectedInline(selected));
  rejects(() => a.prepareInline(paragraph(), () => [], 120, false));
});
test("height fit uses shared arithmetic while scalar domains and exact query widths remain separate", () => {
  const operation = createLayoutOperation(compositionOptions());
  const source = operation.prepareInline(paragraph(), () => [], 120, false);
  for (const width of [0, -Number.MIN_VALUE, NaN, Infinity])
    assert.throws(() => operation.selectInline(source, { width, maxHeight: 100 }), DocumentError);
  for (const maxHeight of [-Number.MIN_VALUE, NaN, Infinity])
    assert.throws(() => operation.selectInline(source, { width: 120, maxHeight }), DocumentError);
  assert.equal(operation.selectInline(source, { width: 120, maxHeight: Number.MIN_VALUE }), undefined);
  assert.ok(operation.selectInline(source, { width: 120, maxHeight: 16 - Number.EPSILON * 16 }));
  assert.equal(operation.selectInline(source, { width: 120, maxHeight: 15.999 }), undefined);
  operation.close();
});
test("failed selections retain cumulative work instead of refunding it with source progress", () => {
  const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 600 } });
  const source = operation.prepareInline(paragraph(), () => [], 120, false);
  let rejected = 0;
  assert.throws(
    () => {
      for (;;) {
        operation.selectInline(source, { width: 24, maxHeight: 0 });
        rejected++;
      }
    },
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.ok(rejected > 0);
  operation.close();
});
test("preparation snapshots rich input and validates inline metrics without invoking getters", () => {
  const operation = createLayoutOperation(compositionOptions());
  const input = paragraph();
  const source = operation.prepareInline(input, () => [], 120, false);
  (input.runs[0]! as { text: string }).text = "changed";
  const selected = operation.selectedInline(operation.selectInline(source, { width: 120, maxHeight: 100 })!);
  assert.equal(selected.measured.line.fragments[0]!.text, "AB CD EF GH IJ");
  let reads = 0;
  const metrics = {
    get advance() {
      reads++;
      return 8;
    },
  };
  assert.throws(
    () => operation.prepareInline(paragraph(), () => [{ runIndex: 0, path: "/visual", metrics }] as never, 120, false),
    DocumentError,
  );
  assert.equal(reads, 0);
  for (const height of [null, 2, { strut: "normal", runs: null }])
    assert.throws(() => operation.prepareInline(paragraph(), () => [], 120, height as never), DocumentError);
  operation.close();
});
