import { fail } from "../core/error.js";
import { finite, number, validateDataObject } from "../core/schema.js";
import { type ResolvedFonts, selectedFont } from "../fonts/resources.js";
import { sum } from "./arithmetic.js";
import { richMetrics } from "./metrics.js";
import type { ParagraphDefinition, TextStyle } from "./types.js";
import { effectiveStyle } from "./validate.js";
import type { WrappedLine } from "./wrap.js";

/** Raw inherited values resolve against each participant, never the parent font size. */
export type LineHeight = number | "normal" | { readonly unit: "pt"; readonly value: number };
export interface InlineLineHeights {
  readonly strut: LineHeight;
  readonly runs?: readonly LineHeight[];
}
export interface LineEnvelope {
  readonly above: number;
  readonly below: number;
  readonly height: number;
}
export function validateLineHeight(value: LineHeight, path: string): void {
  if (value === "normal") return;
  if (typeof value === "number") {
    number(value, path, true);
    return;
  }
  validateDataObject(value, ["unit", "value"], path);
  if (value.unit !== "pt") fail("VALUE", `${path}/unit`, "Expected pt line height");
  number(value.value, `${path}/value`, true);
}
export function participant(style: TextStyle, value: LineHeight, fonts: ResolvedFonts, path: string): LineEnvelope {
  validateLineHeight(value, path);
  const font = selectedFont(style.font, fonts, path);
  const fallback = richMetrics("", style, fonts, path);
  // Descriptor ascent/descent use original font units, not PDF 1000-em units.
  const scale = font ? style.fontSize / font.metadata.unitsPerEm : 1;
  const ascent = finite(font ? font.metadata.descriptor.ascent * scale : fallback.ascent, path);
  const descent = finite(font ? -font.metadata.descriptor.descent * scale : fallback.descent, path);
  const natural = number(sum([ascent, descent]), path, true);
  const height = value === "normal" ? natural : typeof value === "number" ? value * style.fontSize : value.value;
  number(height, path, true);
  const leading = finite(height / 2 - natural / 2, path);
  const above = finite(ascent + leading, path);
  const below = finite(height - above, path);
  // Keep height independent: rounded baseline-relative edges can cancel a tiny positive box.
  return { above, below, height };
}
export function inlineEnvelope(
  wrapped: WrappedLine,
  paragraph: ParagraphDefinition,
  heights: InlineLineHeights,
  fonts: ResolvedFonts,
  path: string,
): LineEnvelope {
  const strut = participant(paragraph.defaultStyle, heights.strut, fonts, path);
  let envelope = strut;
  const seen = new Set<number>();
  for (const atom of wrapped.atoms) {
    if (seen.has(atom.runIndex)) continue;
    seen.add(atom.runIndex);
    const box = atom.atomic
      ? {
          above: finite(atom.metrics.ascent, path),
          below: finite(atom.metrics.descent, path),
          height: number(sum([atom.metrics.ascent, atom.metrics.descent]), path),
        }
      : participant(
          effectiveStyle(paragraph.defaultStyle, paragraph.runs[atom.runIndex]?.style),
          heights.runs?.[atom.runIndex] ?? heights.strut,
          fonts,
          path,
        );
    const above = Math.max(envelope.above, box.above);
    const height = number(
      Math.max(envelope.height + (above - envelope.above), box.height + (above - box.above)),
      path,
      true,
    );
    envelope = { above, below: finite(height - above, path), height };
  }
  return envelope;
}
