import assert from "node:assert/strict";
import test from "node:test";
import { render as coreRender, type DocumentDefinition, DocumentError, type OperationOptions } from "@updf/core";
import {
  type ParagraphDefinition,
  type RichTextInput,
  type TextMeasurementInput,
  measureText as textMeasure,
  measureTextUnknown as textMeasureUnknown,
} from "@updf/text";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";

const measureText = (input: TextMeasurementInput, options: OperationOptions = {}) =>
  textMeasure(input, fontOptions(options));
const measureTextUnknown = (input: unknown, options: OperationOptions = {}) =>
  textMeasureUnknown(input, fontOptions(options));
const render = (input: DocumentDefinition, options: OperationOptions = {}) => coreRender(input, fontOptions(options));

export const paragraph = (text: string, props: Partial<ParagraphDefinition> = {}): ParagraphDefinition => ({
  runs: [{ text }],
  defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
  lineHeight: 12,
  align: "left",
  whiteSpace: "preserve",
  breakLongWords: "error",
  ...props,
});
export const input = (text: string, props: Partial<ParagraphDefinition> = {}, width = 100): RichTextInput => ({
  kind: "rich",
  width,
  paragraphs: [paragraph(text, props)],
});
function strings(value: RichTextInput): readonly string[] {
  return measureText(value).lines.map((line) => line.fragments.map((fragment) => fragment.text).join(""));
}
function rejects(value: unknown, code: string, path?: string): void {
  assert.throws(
    () => measureTextUnknown(value),
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}

test("rich empty block, paragraph, runs and LF retain explicit empty lines and natural/exact height", () => {
  assert.equal(measureText({ kind: "rich", width: 10, height: 0, paragraphs: [] }).consumedHeight, 0);
  assert.deepEqual(strings(input("")), [""]);
  assert.deepEqual(strings(input("a\n\n")), ["a", "", ""]);
  assert.deepEqual(strings(input("", { runs: [] })), [""]);
  const measured = measureText(input("\n"));
  assert.equal(measured.consumedHeight, 24);
  assert.deepEqual(
    measured.lines.map((line) => line.breakReason),
    ["hard", "paragraphEnd"],
  );
  assert.deepEqual(
    measured.lines.map((line) => line.inkBounds),
    [{ empty: true }, { empty: true }],
  );
  assert.equal(measureText({ ...input("\n"), height: 24 }).lineCount, 2);
  rejects({ ...input("\n"), height: 23.999 }, "VERTICAL_OVERFLOW", "/height");
});

test("preserved spaces retain leading/trailing advances; collapse trims hard edges and soft spaces across runs", () => {
  assert.deepEqual(strings(input("  a  \n  b  ")), ["  a  ", "  b  "]);
  assert.deepEqual(strings(input("  a  \n  b  ", { whiteSpace: "collapse" })), ["a", "b"]);
  const runs = [{ text: " a " }, { text: "  ", style: { color: [1, 0, 0] as const } }, { text: "b " }];
  const measured = measureText(input("", { whiteSpace: "collapse", runs }));
  assert.equal(measured.lines[0]?.fragments.map((fragment) => fragment.text).join(""), "a b");
  assert.deepEqual(measured.lines[0]?.fragments[0]?.source, { start: 1, end: 3 });
  assert.equal(measured.lines[0]?.fragments[0]?.runIndex, 0);
  assert.deepEqual(strings(input("a  b", { whiteSpace: "collapse" }, 6)), ["a", "b"]);
});

test("run boundaries are not opportunities; scalar splitting and run segmentation preserve text layout", () => {
  rejects(input("", { runs: [{ text: "ab" }, { text: "cd" }] }, 12), "TOKEN_OVERFLOW", "/paragraphs/0/runs/0/text");
  const value = input("abcdef", { breakLongWords: "codePoint" }, 12);
  const split = input("", { breakLongWords: "codePoint", runs: [{ text: "a" }, { text: "bc" }, { text: "def" }] }, 12);
  assert.deepEqual(strings(value), strings(split));
  assert.deepEqual(
    measureText(value).lines.map((line) => line.advance),
    measureText(split).lines.map((line) => line.advance),
  );
  rejects(input("W", { breakLongWords: "codePoint" }, 1), "TOKEN_OVERFLOW");
  assert.deepEqual(strings(input("a    b", { breakLongWords: "codePoint" }, 6)), ["a", "  ", "  ", "b"]);
});

test("whole-line alignment, mixed-size common baseline and immutable private-free results agree with PDF commands", () => {
  const value = input("", {
    align: "center",
    lineHeight: 24,
    runs: [{ text: "A", style: { fontSize: 20, color: [1, 0, 0] } }, { text: "B" }],
  });
  const measured = measureText(value);
  const line = measured.lines[0];
  assert.ok(line);
  assert.equal(line.baseline, 17.5);
  assert.equal(line.fragments[0]?.x, (value.width - line.advance) / 2);
  assert.ok(Object.isFrozen(measured) && Object.isFrozen(line.fragments[0]?.style.color));
  assert.equal(Reflect.set(line, "baseline", 0), false);
  assert.equal(Object.isFrozen(value), false);
  const bytes = render({
    version: 1,
    pages: [
      {
        width: 200,
        height: 200,
        children: [
          {
            type: "richText",
            x: 10,
            y: 10,
            width: value.width,
            height: measured.consumedHeight,
            paragraphs: value.paragraphs,
          },
        ],
      },
    ],
  });
  const raw = new TextDecoder().decode(bytes);
  assert.match(raw, /1 0 0 rg\nBT \/F1 20 Tf/);
  assert.match(raw, /0 0 0 rg\nBT \/F1 10 Tf/);
  assert.match(raw, /172\.5 Tm/);
  assert.ok(!JSON.stringify(measured).includes("glyphs"));
});

test("plain public measurement preserves fixed baseline, wraps, LF, empty text and selected schema", () => {
  const plain = { kind: "plain", text: "AB\n", width: 20, fontSize: 10, lineHeight: 12, align: "left" } as const;
  const result = measureText(plain);
  assert.equal(result.lines[0]?.baseline, 7.75);
  assert.equal(result.lines[1]?.baseline, 19.75);
  assert.equal(result.consumedHeight, 24);
  assert.equal(measureText({ ...plain, text: "" }).lineCount, 0);
  rejects({ ...plain, height: 23 }, "VERTICAL_OVERFLOW");
  rejects({ ...plain, paragraphs: [] }, "KEY", "/paragraphs");
});

test("data keys, optional undefined, styles, controls, arrays and caps fail before copying or font traversal", () => {
  rejects({ ...input("x"), extra: true }, "KEY", "/extra");
  rejects({ ...input("x"), height: undefined }, "TYPE", "/height");
  rejects(
    input("", { runs: [{ text: "x", style: { fontSize: undefined } }] } as unknown as ParagraphDefinition),
    "TYPE",
  );
  rejects(input("\t"), "CHARACTER", "/paragraphs/0/runs/0/text");
  rejects(input("\r"), "CHARACTER");
  rejects(input("x", { lineHeight: 9 }), "GEOMETRY");
  rejects(input("x", { defaultStyle: { font: "Missing", fontSize: 10, color: [0, 0, 0] } }), "FONT_RESOURCE");
  assert.throws(() => measureText(input("x".repeat(4097)), { limits: { textCodePoints: 4096 } }), DocumentError);
  assert.equal(
    measureText({ kind: "rich", width: 10, paragraphs: Array.from({ length: 5001 }, () => paragraph("")) }).lineCount,
    5001,
  );
  assert.equal(measureText(input("", { runs: Array.from({ length: 10000 }, () => ({ text: "" })) })).lineCount, 1);
  let invoked = false;
  const getter = {
    get text() {
      invoked = true;
      return "x";
    },
  };
  rejects({ ...input(""), paragraphs: [{ ...paragraph(""), runs: [getter] }] }, "TYPE");
  assert.equal(invoked, false);
});

test("no public work cap; aggregate generated rich/plain text shares the optional rendering budget", () => {
  const empty = {
    kind: "rich",
    width: 10,
    paragraphs: Array.from({ length: 5000 }, () => paragraph("", { runs: [] })),
  } as const;
  assert.equal(measureText(empty).lineCount, 5000);
  assert.equal(measureText(empty).lineCount, 5000);
  const block = {
    type: "richText",
    x: 0,
    y: 0,
    width: 100000,
    height: 12,
    paragraphs: [paragraph(" ".repeat(4096))],
  } as const;
  const plain = {
    type: "text",
    x: 0,
    y: 0,
    width: 100000,
    height: 12,
    text: " ".repeat(1696),
    fontSize: 10,
    lineHeight: 12,
    align: "left",
  } as const;
  const children = [...Array.from({ length: 24 }, () => block), plain];
  assert.ok(render({ version: 1, pages: [{ width: 100000, height: 100, children }] }).length);
  assert.throws(
    () =>
      render(
        { version: 1, pages: [{ width: 100000, height: 100, children: [...children, { ...plain, text: " " }] }] },
        { profile: "service" },
      ),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(
    measureText(
      input("", { runs: Array.from({ length: 4096 }, () => ({ text: "x" })), breakLongWords: "codePoint" }, 6),
    ).lineCount,
    4096,
  );
});
