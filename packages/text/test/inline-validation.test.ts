import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { compositionOptions, createLayoutOperation } from "../../../tests/fixtures/text-flow/options.js";
import { rectangular } from "../../../tests/fixtures/text-flow/rectangular.js";

const paragraph = () => rectangular("AB", { whiteSpace: "preserve" }).paragraphs[0]!;
const heights = [false, true, { strut: "normal" }] as const;
const invalid = () => [
  ...[-Number.MIN_VALUE, -1, 0, null, "16", NaN, Infinity].map((lineHeight) => ({
    value: { ...paragraph(), lineHeight },
    suffix: "/lineHeight",
  })),
  { value: null, suffix: "" },
  { value: {}, suffix: "/runs" },
  { value: { ...paragraph(), runs: null }, suffix: "/runs" },
  { value: { ...paragraph(), runs: [null] }, suffix: "/runs/0" },
  { value: { ...paragraph(), defaultStyle: null }, suffix: "/defaultStyle" },
  {
    value: { ...paragraph(), defaultStyle: { ...paragraph().defaultStyle, fontSize: 0 } },
    suffix: "/defaultStyle/fontSize",
  },
  { value: { ...paragraph(), runs: [{ text: "A", style: { fontSize: "12" } }] }, suffix: "/runs/0/style/fontSize" },
];

for (const method of ["prepareInline", "measureInline"] as const) {
  test(`${method} rejects original domains and shapes equally before callbacks in every height mode`, () => {
    for (const { value, suffix } of invalid()) {
      const diagnostics = heights.map((height) => {
        const operation = createLayoutOperation(compositionOptions());
        let callbacks = 0;
        let diagnostic: DocumentError["diagnostics"][number] | undefined;
        assert.throws(
          () =>
            operation[method](
              value as never,
              () => {
                callbacks++;
                return [];
              },
              120,
              height,
              "/bad",
            ),
          (error: unknown) => {
            assert.ok(error instanceof DocumentError);
            diagnostic = error.diagnostics[0];
            return true;
          },
        );
        assert.equal(callbacks, 0);
        assert.equal(diagnostic?.path, `/bad/paragraphs/0${suffix}`);
        operation.close();
        return diagnostic;
      });
      assert.deepEqual(diagnostics[1], diagnostics[0]);
      assert.deepEqual(diagnostics[2], diagnostics[0]);
    }
  });
}

test("valid normal and automatic heights retain uniform geometry with authored leading below font size", () => {
  const operation = createLayoutOperation(compositionOptions());
  const value = { ...paragraph(), lineHeight: Number.MIN_VALUE };
  for (const height of [true, { strut: "normal" }] as const) {
    let callbacks = 0;
    const visuals = () => {
      callbacks++;
      return [];
    };
    const source = operation.prepareInline(value, visuals, 120, height, "/valid");
    const selected = operation.selectedInline(operation.selectInline(source, { width: 120, maxHeight: 100 })!);
    const uniform = operation.measureInline(value, visuals, 120, height, "/valid");
    assert.deepEqual(selected.measured, uniform[0]);
    assert.equal(selected.measured.line.height, value.defaultStyle.fontSize);
    assert.equal(callbacks, 2);
  }
  operation.close();
});

test("automatic-height preparation retains cumulative validation work charges", () => {
  for (const height of [true, { strut: "normal" }] as const) {
    const operation = createLayoutOperation({ ...compositionOptions(), limits: { nodes: 600 } });
    let callbacks = 0;
    assert.throws(
      () => {
        for (;;)
          operation.prepareInline(
            paragraph(),
            () => {
              callbacks++;
              return [];
            },
            120,
            height,
          );
      },
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
    );
    assert.ok(callbacks > 0);
    operation.close();
  }
});
