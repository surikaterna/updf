import { finite } from "@updf/core/internal";
import { lineBaseline, lineLeading } from "./baseline.js";
import { richMetrics } from "./metrics.js";
import type { ResolvedTextResources } from "./text-resources.js";
import type { ParagraphDefinition } from "./types.js";
import { effectiveStyle } from "./validate.js";
import type { Atom } from "./wrap.js";

/** Bound every selected fixed-height line, including default empty-line metrics. */
export function selectionBand(
  atoms: readonly Atom[],
  paragraph: ParagraphDefinition,
  fonts: ResolvedTextResources,
  path: string,
): (top: number) => readonly [number, number] {
  const empty = richMetrics("", effectiveStyle(paragraph.defaultStyle), fonts, path);
  let minAscent = empty.ascent,
    maxAscent = empty.ascent;
  let minDescent = empty.descent,
    maxDescent = empty.descent;
  let glyphTop = 0,
    glyphBottom = 0;
  for (const atom of atoms) {
    if (atom.text === "\n") continue;
    const m = atom.metrics;
    minAscent = Math.min(minAscent, m.ascent);
    maxAscent = Math.max(maxAscent, m.ascent);
    minDescent = Math.min(minDescent, m.descent);
    maxDescent = Math.max(maxDescent, m.descent);
    if (!m.empty) {
      glyphTop = Math.min(glyphTop, m.top);
      glyphBottom = Math.max(glyphBottom, m.bottom);
    }
  }
  // Bound each operand independently in the painting association. Monotone
  // binary64 operations retain containment, including rounding at the actual top.
  const lowLeading = finite(lineLeading(paragraph.lineHeight, maxAscent, maxDescent), path);
  const highLeading = finite(lineLeading(paragraph.lineHeight, minAscent, minDescent), path);
  return (top) => [
    finite(Math.min(top, lineBaseline(top, minAscent, lowLeading) + glyphTop), path),
    finite(Math.max(top + paragraph.lineHeight, lineBaseline(top, maxAscent, highLeading) + glyphBottom), path),
  ];
}
