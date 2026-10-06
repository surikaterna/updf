import { readFile } from "node:fs/promises";
import type { DocumentDefinition, ParagraphDefinition, RichTextNode } from "@updf/core";
import { createPreparedFont, type PreparedFont } from "@updf/fonts";
import { record } from "../../../packages/fonts/dist/cjs/checks.js";

export async function fontInput(): Promise<Record<string, unknown>> {
  const root = new URL("./", import.meta.url);
  const data: unknown = JSON.parse(await readFile(new URL("liberation-sans.json", root), "utf8"));
  record(data, "/fixture");
  return { ...data, bytes: new Uint8Array(await readFile(new URL("LiberationSans-Regular.ttf", root))) };
}
export async function fixtureFont(): Promise<PreparedFont> {
  return createPreparedFont(await fontInput());
}
export function fontParagraph(
  text: string,
  font = "Demo",
  fontSize = 16,
  lineHeight = 24,
  align: ParagraphDefinition["align"] = "left",
): ParagraphDefinition {
  return {
    runs: [{ text }],
    defaultStyle: { font, fontSize, color: [0, 0, 0] },
    lineHeight,
    align,
    whiteSpace: "preserve",
    breakLongWords: "error",
  };
}
export const fontText = (text: string, overrides: Partial<RichTextNode> = {}): RichTextNode => ({
  type: "richText",
  x: 20,
  y: 20,
  width: 400,
  height: 100,
  paragraphs: [fontParagraph(text)],
  ...overrides,
});
export const fontDocument = (children: readonly RichTextNode[]): DocumentDefinition => ({
  version: 1,
  pages: [{ width: 595, height: 842, children }],
});
