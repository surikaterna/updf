import type { RichTextInput } from "@updf/text";
import type { ParagraphDefinition, RichTextNode } from "@updf/core";

export function richNode(
  text: string,
  geometry: Partial<Omit<RichTextNode, "type" | "paragraphs">> = {},
  paragraph: Partial<ParagraphDefinition> = {},
): RichTextNode {
  return {
    type: "richText",
    x: 0,
    y: 0,
    width: 100,
    height: 12,
    ...geometry,
    paragraphs: [{ ...richInput(text).paragraphs[0]!, ...paragraph }],
  };
}

/** Test-only authoring shorthand; production callers supply the canonical paragraph data. */
export function richInput(
  text: string,
  width = 100,
  fontSize = 10,
  lineHeight = 12,
  font = "Helvetica",
): RichTextInput {
  return {
    width,
    paragraphs: [
      {
        runs: [{ text }],
        defaultStyle: { font, fontSize, color: [0, 0, 0] },
        lineHeight,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  };
}
