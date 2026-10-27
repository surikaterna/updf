import type { ParagraphDefinition, RichTextInput } from "@updf/text";

export function rectangular(text: string, props: Partial<ParagraphDefinition> = {}, width = 100): RichTextInput {
  return {
    width,
    paragraphs: [
      {
        runs: [{ text }],
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        lineHeight: 16,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
        ...props,
      },
    ],
  };
}

export function rectangularCases(font: string): Record<string, RichTextInput> {
  const defaultStyle = { font, fontSize: 10, color: [0, 0, 0] as const };
  return {
    empty: rectangular("", { defaultStyle }),
    hardBreaks: rectangular("A\n\nB\n", { defaultStyle }),
    preserve: rectangular("  A   B  ", { defaultStyle }),
    collapse: rectangular("  A   B  ", { defaultStyle, whiteSpace: "collapse" }),
    codePoint: rectangular("abcdefghijk", { defaultStyle, breakLongWords: "codePoint" }, 20),
    mixed: rectangular("", {
      defaultStyle,
      lineHeight: 24,
      runs: [{ text: "Red ", style: { fontSize: 16, color: [1, 0, 0] } }, { text: "black" }],
    }),
  };
}
