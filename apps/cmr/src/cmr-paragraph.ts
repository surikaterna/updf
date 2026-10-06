import type { ParagraphDefinition, TextAlign } from "@updf/core";

/** CMR field typography; resource identifiers remain document data, not font handles. */
export function cmrParagraph(
  text: string,
  fontSize = 6,
  align: TextAlign = "left",
  font = "Helvetica",
): readonly ParagraphDefinition[] {
  return [
    {
      runs: [{ text }],
      defaultStyle: { font, fontSize, color: [0, 0, 0] },
      lineHeight: fontSize * 1.2,
      align,
      whiteSpace: "preserve",
      breakLongWords: "error",
    },
  ];
}
