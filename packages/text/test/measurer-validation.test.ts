import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import type { TextRuntime } from "@updf/core/resources";
import { fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, measureTextUnknown } from "@updf/text";

const input = { kind: "plain", text: "A", width: 10, fontSize: 10, lineHeight: 12, align: "left" } as const;
const output = () => ({
  width: 10,
  consumedHeight: 12,
  lineCount: 1,
  lines: [
    {
      paragraphIndex: 0,
      top: 0,
      height: 12,
      baseline: 8,
      advance: 5,
      breakReason: "paragraphEnd" as const,
      inkBounds: { empty: false as const, left: 0, right: 5, top: 0, bottom: 10 },
      fragments: [
        {
          x: 0,
          advance: 5,
          runIndex: 0,
          text: "A",
          style: { font: "Host", fontSize: 10, color: [0, 0, 0] as const },
          source: { start: 0, end: 1 },
          inkBounds: { empty: false as const, left: 0, right: 5, top: 0, bottom: 10 },
        },
      ],
    },
  ],
});
function invalid(value: unknown, path: string) {
  assert.throws(
    () => measureTextUnknown(input, { measurer: { measure: () => value as ReturnType<typeof measureTextUnknown> } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.path === path,
  );
}

test("a structural measure-only service needs no font implementation and preserves fractional coordinates", () => {
  const source = output();
  source.lines[0]!.baseline = 8.25;
  source.lines[0]!.fragments[0]!.x = 0.125;
  const result = measureTextUnknown(input, {
    measurer: { measure: () => source },
  });
  assert.deepEqual(result, source);
  assert.ok(Object.isFrozen(result.lines[0]?.fragments[0]?.source));
  source.lines[0]!.fragments[0]!.source.end = 9;
  assert.equal(result.lines[0]?.fragments[0]?.source.end, 1);
});

test("measurement DTO validation requires complete lines, styles, source spans, and finite ordered ink", () => {
  const result = output(),
    line = result.lines[0]!,
    fragment = line.fragments[0]!;
  invalid({ ...result, lineCount: 0 }, "/lineCount");
  invalid({ ...result, lineCount: 0.5 }, "/lineCount");
  for (const key of ["paragraphIndex", "top", "height", "baseline", "advance", "inkBounds", "fragments"])
    invalid({ ...result, lines: [{ ...line, [key]: undefined }] }, `/lines/0/${key}`);
  invalid({ ...result, lines: [{ ...line, paragraphIndex: 0.5 }] }, "/lines/0/paragraphIndex");
  invalid({ ...result, lines: [{ ...line, breakReason: "other" }] }, "/lines/0/breakReason");
  const withFragment = (change: object) => ({
    ...result,
    lines: [{ ...line, fragments: [{ ...fragment, ...change }] }],
  });
  invalid(withFragment({ source: { start: 2, end: 1 } }), "/lines/0/fragments/0/source");
  invalid(withFragment({ source: { start: 0, end: 0.5 } }), "/lines/0/fragments/0/source/end");
  invalid(withFragment({ runIndex: -1 }), "/lines/0/fragments/0/runIndex");
  invalid(withFragment({ style: { ...fragment.style, color: [0, 0, 2] } }), "/lines/0/fragments/0/style/color/2");
  invalid(withFragment({ style: { ...fragment.style, fontSize: 0 } }), "/lines/0/fragments/0/style/fontSize");
  invalid(
    withFragment({ inkBounds: { empty: false, left: 5, right: 0, top: 0, bottom: 10 } }),
    "/lines/0/fragments/0/inkBounds",
  );
  for (const value of [NaN, Infinity, -Infinity]) invalid(withFragment({ x: value }), "/lines/0/fragments/0/x");
  const getter = Object.defineProperty({ ...fragment }, "advance", { get: () => assert.fail("output getter") });
  invalid({ ...result, lines: [{ ...line, fragments: [getter] }] }, "/lines/0/fragments/0/advance");
});

test("both factories validate all six runtime capabilities, including unused lineMetrics, without calls", () => {
  for (const factory of [createTextMeasurer, createTextService]) {
    for (const key of [
      "validateResource",
      "validateText",
      "fixedPolicy",
      "lineMetrics",
      "measure",
      "joinRuns",
    ] as const) {
      const callbacks = Object.fromEntries(
        Object.keys(fontRuntime()).map((key) => [key, () => assert.fail("runtime callback")]),
      );
      const missing = { ...callbacks, [key]: undefined } as unknown as TextRuntime;
      assert.throws(() => factory({ runtime: missing }), DocumentError);
      const getter = Object.defineProperty({ ...callbacks }, key, { get: () => assert.fail("runtime getter") });
      assert.throws(() => factory({ runtime: getter as unknown as TextRuntime }), DocumentError);
    }
    assert.throws(() => factory({ runtime: Object.create(fontRuntime()) }), DocumentError);
  }
});
