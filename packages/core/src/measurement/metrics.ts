import { inkAscent, textWidth } from "../core/metrics.js";
import { fontRun } from "../fonts/measure.js";
import { type ResolvedFonts, selectedFont } from "../fonts/resources.js";
import type { PreparedFont, PreparedGlyph } from "../fonts/types.js";
import type { InkBounds, TextStyle } from "./types.js";

export interface RunMetrics {
  readonly advance: number;
  readonly left: number;
  readonly right: number;
  readonly ascent: number;
  readonly descent: number;
  readonly top: number;
  readonly bottom: number;
  readonly empty: boolean;
  readonly font?: PreparedFont;
  readonly glyphs?: readonly PreparedGlyph[];
}
export function metrics(text: string, style: TextStyle, fonts: ResolvedFonts, path: string): RunMetrics {
  const font = selectedFont(style.font, fonts, path);
  if (!font) {
    const advance = textWidth(text, style.fontSize);
    return {
      advance,
      left: 0,
      right: advance,
      ascent: style.fontSize * inkAscent,
      descent: style.fontSize * (1 - inkAscent),
      top: -style.fontSize * inkAscent,
      bottom: style.fontSize * (1 - inkAscent),
      empty: !/[^ ]/u.test(text),
    };
  }
  const run = fontRun(text, font, path);
  const scale = style.fontSize / font.metadata.unitsPerEm;
  return {
    advance: run.advance * scale,
    left: (run.ink?.[0] ?? 0) * scale,
    right: (run.ink?.[2] ?? 0) * scale,
    ascent: Math.max(0, run.ink?.[3] ?? 0) * scale,
    descent: Math.max(0, -(run.ink?.[1] ?? 0)) * scale,
    top: -(run.ink?.[3] ?? 0) * scale,
    bottom: -(run.ink?.[1] ?? 0) * scale,
    empty: run.ink === null,
    font,
    glyphs: run.glyphs,
  };
}
export function richMetrics(text: string, style: TextStyle, fonts: ResolvedFonts, path: string): RunMetrics {
  const result = metrics(text, style, fonts, path);
  if (result.font) return result;
  // The conservative Helvetica envelope is exactly one em. Compute its
  // complement rather than independently rounding both sides of the baseline.
  const descent = style.fontSize - result.ascent;
  return { ...result, descent, bottom: descent };
}
export function ink(run: RunMetrics, x: number, baseline: number): InkBounds {
  return Object.freeze(
    run.empty
      ? { empty: true }
      : {
          empty: false,
          left: x + run.left,
          right: x + run.right,
          top: baseline + run.top,
          bottom: baseline + run.bottom,
        },
  );
}
export function union(bounds: readonly InkBounds[]): InkBounds {
  const nonempty = bounds.filter((item) => !item.empty);
  if (!nonempty.length) return Object.freeze({ empty: true });
  return Object.freeze({
    empty: false,
    left: nonempty.reduce((edge, item) => Math.min(edge, item.left), Infinity),
    right: nonempty.reduce((edge, item) => Math.max(edge, item.right), -Infinity),
    top: nonempty.reduce((edge, item) => Math.min(edge, item.top), Infinity),
    bottom: nonempty.reduce((edge, item) => Math.max(edge, item.bottom), -Infinity),
  });
}
