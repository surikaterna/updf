import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createLayoutOperation } from "@updf/core/internal";
import { createOwnedResource, type TextRun, type TextRuntime } from "@updf/core/resources";
import { createHelvetica, createPreparedFont, fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, measureTextUnknown } from "@updf/text";
import { fontInput } from "../../../tests/fixtures/fonts/font-fixture.js";
import { richInput } from "../../../tests/fixtures/rich-input.js";

function rejects(run: () => unknown, code: string, path: string) {
  assert.throws(
    run,
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.code === code && error.diagnostics[0]?.path === path,
  );
}
const runtime: TextRuntime = {
  validateResource() {},
  validateText() {},
  lineMetrics: () => ({ ascent: 8, descent: 2 }),
  measure: (_resource, text) => ({
    advance: Array.from(text).length * 5,
    left: 0,
    right: Array.from(text).length * 5,
    ascent: 8,
    descent: 2,
    top: -8,
    bottom: 2,
    empty: !text,
    run: Object.freeze({}) as TextRun,
  }),
  joinRuns: () => Object.freeze({}) as TextRun,
};
function invalidInputs(): readonly (readonly [unknown, string, string])[] {
  const canonical = richInput("A", 100, 10, 12, "Demo");
  return [
    ["A", "TYPE", ""],
    [{ kind: "plain", text: "A", width: 100, fontSize: 10, lineHeight: 12, align: "left" }, "KEY", "/kind"],
    [{ ...canonical, kind: "rich" }, "KEY", "/kind"],
    ...["text", "font", "fontSize", "lineHeight", "align"].map(
      (key) => [{ ...canonical, [key]: "legacy" }, "KEY", `/${key}`] as const,
    ),
    [{ ...canonical, height: undefined }, "TYPE", "/height"],
    [
      { width: 100, paragraphs: [{ ...canonical.paragraphs[0], defaultStyle: { fontSize: 10, color: [0, 0, 0] } }] },
      "TYPE",
      "/paragraphs/0/defaultStyle/font",
    ],
  ] as const;
}

test("both factory measurement paths reject legacy forms for Helvetica, prepared and host capabilities", async () => {
  const sources = [
    { resource: createHelvetica(), runtime: fontRuntime() },
    { resource: createPreparedFont(await fontInput()), runtime: fontRuntime() },
    { resource: createOwnedResource({ host: true }), runtime },
  ];
  for (const source of sources) {
    const options = { resources: { Demo: source.resource }, measurer: createTextMeasurer({ runtime: source.runtime }) };
    const operation = createLayoutOperation({
      resources: options.resources,
      text: createTextService({ runtime: source.runtime, defaultFont: "Demo" }),
    });
    try {
      for (const [input, code, path] of invalidInputs()) {
        rejects(() => measureTextUnknown(input, options), code, path);
        rejects(() => operation.measureText(input as never, ""), code, path);
      }
      assert.equal(measureTextUnknown(richInput("A", 100, 10, 12, "Demo"), options).lineCount, 1);
    } finally {
      operation.close();
    }
  }
});

test("source container caps and scalar quotas charge canonical data once, with UTF-16 LF spans", () => {
  const options = { resources: { Demo: createOwnedResource({}) }, measurer: createTextMeasurer({ runtime }) };
  const input = richInput("😀\nA", 100, 10, 12, "Demo");
  const result = measureTextUnknown(input, { ...options, limits: { nodes: 7, depth: 4, textCodePoints: 3 } });
  assert.deepEqual(
    result.lines.map((line) => line.paragraphIndex),
    [0, 0],
  );
  assert.deepEqual(
    result.lines.map((line) => line.fragments[0]?.source),
    [
      { start: 0, end: 2 },
      { start: 3, end: 4 },
    ],
  );
  rejects(
    () => measureTextUnknown(input, { ...options, limits: { nodes: 6 } }),
    "LIMIT",
    "/paragraphs/0/defaultStyle/color",
  );
  rejects(
    () => measureTextUnknown(input, { ...options, limits: { textCodePoints: 2 } }),
    "LIMIT",
    "/paragraphs/0/runs/0/text",
  );
});

test("structured accessors are rejected before runtime traversal and optional undefined is never a default", () => {
  const options = { resources: { Demo: createOwnedResource({}) }, measurer: createTextMeasurer({ runtime }) };
  const input = richInput("A", 100, 10, 12, "Demo");
  const getter = Object.defineProperty({ ...input.paragraphs[0] }, "runs", {
    enumerable: true,
    get: () => assert.fail("source getter"),
  });
  rejects(() => measureTextUnknown({ ...input, paragraphs: [getter] }, options), "TYPE", "/paragraphs/0/runs");
  rejects(() => createTextService({ runtime, defaultFont: undefined } as never), "TYPE", "/text/defaultFont");
  rejects(() => createTextMeasurer({ runtime, defaultFont: "Demo" } as never), "KEY", "/text/defaultFont");
});
