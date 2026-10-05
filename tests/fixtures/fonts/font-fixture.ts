import { readFile } from "node:fs/promises";
import type { DocumentDefinition, TextNode } from "@updf/core";
import { createPreparedFont, type PreparedFont } from "@updf/core/fonts";
import { record } from "../../../packages/core/dist/cjs/fonts/checks.js";

export async function fontInput(): Promise<Record<string, unknown>> {
  const root = new URL("./", import.meta.url);
  const data: unknown = JSON.parse(await readFile(new URL("liberation-sans.json", root), "utf8"));
  record(data, "/fixture");
  return { ...data, bytes: new Uint8Array(await readFile(new URL("LiberationSans-Regular.ttf", root))) };
}
export async function fixtureFont(): Promise<PreparedFont> {
  return createPreparedFont(await fontInput());
}
export const fontText = (text: string, overrides: Partial<TextNode> = {}): TextNode => ({
  type: "text",
  x: 20,
  y: 20,
  width: 400,
  height: 100,
  text,
  font: "Demo",
  fontSize: 16,
  lineHeight: 24,
  align: "left",
  ...overrides,
});
export const fontDocument = (children: readonly TextNode[]): DocumentDefinition => ({
  version: 1,
  pages: [{ width: 595, height: 842, children }],
});
