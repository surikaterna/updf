import type { ParagraphDefinition, RichTextNode } from "@updf/core";
import type { TextLineMeasurement } from "@updf/core/measurement";

/** Reconstitute normalized complete lines, never substring/reflow the source paragraph. */
export function paragraphLine(
  paragraph: ParagraphDefinition,
  line: TextLineMeasurement,
  x: number,
  y: number,
  width: number,
): RichTextNode {
  return {
    type: "richText",
    x,
    y,
    width,
    height: line.height,
    paragraphs: [
      {
        ...paragraph,
        whiteSpace: "preserve",
        runs: line.fragments.map((fragment) => ({ text: fragment.text, style: fragment.style })),
      },
    ],
  };
}
