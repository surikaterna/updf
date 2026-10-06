import {
  array,
  checkLimit,
  codePoints,
  DocumentError,
  fail,
  number,
  validateDataObject as record,
} from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import { textOnce, type WorkLedger, work } from "./ledger.js";
import { preflight } from "./source.js";
import { type ResolvedTextResources as ResolvedFonts, selectedFont, validateCharacters } from "./text-resources.js";
import type { ParagraphDefinition, TextMeasurementInput, TextStyle } from "./types.js";

function data(value: unknown, keys: readonly string[], path: string): asserts value is Record<string, unknown> {
  record(value, keys, path);
  for (const key of Object.keys(value))
    if (value[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit optional fields instead of undefined");
}
function choice(value: unknown, choices: readonly string[], path: string): void {
  if (typeof value !== "string" || !choices.includes(value)) fail("VALUE", path, "Unsupported choice");
}
function style(value: unknown, path: string, partial = false): void {
  data(value, ["font", "fontSize", "color"], path);
  if (!partial || "font" in value) if (typeof value.font !== "string") fail("TYPE", `${path}/font`, "Expected font id");
  if (!partial || "fontSize" in value) number(value.fontSize, `${path}/fontSize`, true);
  if (partial && !("color" in value)) return;
  array(value.color, 3, `${path}/color`);
  if (value.color.length !== 3) fail("VALUE", `${path}/color`, "Expected RGB triple");
  value.color.forEach((item, i) => {
    if (number(item, `${path}/color/${i}`) > 1) fail("VALUE", `${path}/color/${i}`, "RGB must be 0..1");
  });
}
function paragraph(value: unknown, path: string, budget: WorkLedger): number {
  data(value, ["runs", "defaultStyle", "lineHeight", "align", "whiteSpace", "breakLongWords"], path);
  array(value.runs, budget.policy.nodes, `${path}/runs`);
  work(budget, 1 + value.runs.length, path);
  style(value.defaultStyle, `${path}/defaultStyle`);
  number(value.lineHeight, `${path}/lineHeight`, true);
  choice(value.align, ["left", "center", "right"], `${path}/align`);
  choice(value.whiteSpace, ["preserve", "collapse"], `${path}/whiteSpace`);
  choice(value.breakLongWords, ["error", "codePoint"], `${path}/breakLongWords`);
  let chars = 0;
  value.runs.forEach((run, i) => {
    const at = `${path}/runs/${i}`;
    data(run, ["text", "style"], at);
    if (typeof run.text !== "string") fail("TYPE", `${at}/text`, "Expected text");
    chars = checkLimit(chars + codePoints(run.text), budget.policy.textCodePoints, `${at}/text`, "Text code points");
    if ("style" in run) style(run.style, `${at}/style`, true);
  });
  textOnce(budget, value.runs, chars, path);
  return chars;
}
export function effectiveStyle(base: TextStyle, override: Partial<TextStyle> = {}): TextStyle {
  const color = override.color ?? base.color;
  return Object.freeze({ ...base, ...override, color: Object.freeze([color[0], color[1], color[2]] as const) });
}
export function validateStyle(value: TextStyle, fonts: ResolvedFonts, path: string): void {
  style(value, path);
  selectedFont(value.font, fonts, `${path}/font`);
}
function fontStyles(paragraph: ParagraphDefinition, fonts: ResolvedFonts, path: string): void {
  selectedFont(paragraph.defaultStyle.font, fonts, `${path}/defaultStyle/font`);
  if (paragraph.lineHeight < paragraph.defaultStyle.fontSize)
    fail("GEOMETRY", `${path}/lineHeight`, "Line height must be at least font size");
  paragraph.runs.forEach((run, i) => {
    const at = `${path}/runs/${i}`;
    const style = effectiveStyle(paragraph.defaultStyle, run.style);
    if (paragraph.lineHeight < style.fontSize) fail("GEOMETRY", `${at}/style/fontSize`, "Font exceeds line height");
    runCharacters(run.text, selectedFont(style.font, fonts, `${at}/style/font`), fonts, `${at}/text`);
  });
}
function runCharacters(text: string, font: OwnedResource, fonts: ResolvedFonts, path: string): void {
  let start = 0;
  for (const char of text) {
    try {
      validateCharacters(char, font, fonts, path);
    } catch (error: unknown) {
      if (!(error instanceof DocumentError)) throw error;
      const diagnostic = error.diagnostics[0];
      if (!diagnostic) throw error;
      throw new DocumentError(diagnostic.code, diagnostic.path, diagnostic.message, {
        span: { start, end: start + char.length },
      });
    }
    start += char.length;
  }
}
export function validateParagraphs(
  value: unknown,
  budget: WorkLedger,
  path: string,
): asserts value is readonly ParagraphDefinition[] {
  array(value, budget.policy.nodes, path);
  let chars = 0;
  value.forEach((item, i) => {
    const count = paragraph(item, `${path}/${i}`, budget);
    chars += count;
    checkLimit(chars, budget.policy.textCodePoints, `${path}/${i}`, "Text code points");
  });
}
export function validateInput(
  input: unknown,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  path: string,
): asserts input is TextMeasurementInput {
  preflight(input, budget, path);
  data(input, ["width", "height", "paragraphs"], path);
  number(input.width, `${path}/width`, true);
  if ("height" in input) number(input.height, `${path}/height`);
  validateParagraphs(input.paragraphs, budget, `${path}/paragraphs`);
  input.paragraphs.forEach((item, i) => {
    fontStyles(item, fonts, `${path}/paragraphs/${i}`);
  });
}
