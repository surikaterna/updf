import type { NodeDefinition } from "../types.js";
import type { InlineLine } from "./inline.js";
import type { ParagraphDefinition } from "./types.js";

/** Reconstruct fixed native text at the measured baseline without clipping line-box overflow. */
export function paintInlineText(
  measured: InlineLine,
  paragraph: ParagraphDefinition,
  x: number,
  y: number,
  visualRuns: ReadonlySet<number> = new Set(),
): readonly NodeDefinition[] {
  const { line } = measured;
  const children = line.fragments.flatMap((fragment, index): NodeDefinition[] => {
    if (visualRuns.has(fragment.runIndex)) return [];
    const height = measured.nativeHeights[index] ?? fragment.style.fontSize;
    const pad = measured.nativePads[index] ?? 0;
    return [
      {
        type: "richText",
        x: fragment.x - pad,
        y: (measured.nativeTops[index] ?? line.top) - line.top,
        width: measured.nativeWidths[index] ?? fragment.advance,
        height,
        paragraphs: [
          {
            ...paragraph,
            defaultStyle: fragment.style,
            runs: [{ text: fragment.text }],
            lineHeight: height,
            align: pad > 0 ? "center" : "left",
            whiteSpace: "preserve",
          },
        ],
      },
    ];
  });
  return [{ type: "paintGroup", transform: [1, 0, 0, 1, x, y], children }];
}
