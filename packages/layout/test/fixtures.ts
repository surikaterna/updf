import type { ParagraphDefinition, TextNode } from "@updf/core";
import type { FlowBlock, FlowDocumentDefinition, PageTemplate } from "@updf/layout";

export function paragraph(text: string, overrides: Partial<ParagraphDefinition> = {}): ParagraphDefinition {
  return {
    runs: [{ text }],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
    lineHeight: 10,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "codePoint",
    ...overrides,
  };
}
export function fixed(text = "Header"): TextNode {
  return { type: "text", x: 0, y: 0, width: 80, height: 10, text, fontSize: 10, lineHeight: 10, align: "left" };
}
export function flow(body: readonly FlowBlock[] = [], overrides: Partial<PageTemplate> = {}): FlowDocumentDefinition {
  return {
    pageTemplate: { width: 100, height: 40, margins: { top: 0, right: 0, bottom: 0, left: 0 }, ...overrides },
    body,
  };
}
