import { glyphRun } from "./profile.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

export interface FontRunMetrics {
  advance: number;
  left: number;
  right: number;
  ascent: number;
  descent: number;
  glyphs: readonly PreparedGlyph[];
  ink: readonly [number, number, number, number] | null;
}

export function fontRun(text: string, font: PreparedFont, path: string): FontRunMetrics {
  const glyphs = glyphRun(text, font, path);
  let advance = 0;
  let left = 0;
  let right = 0;
  let ascent = 0;
  let descent = 0;
  let inkLeft = Infinity,
    inkRight = -Infinity,
    inkTop = -Infinity,
    inkBottom = Infinity;
  for (const glyph of glyphs) {
    if (glyph.bounds[0] !== glyph.bounds[2] && glyph.bounds[1] !== glyph.bounds[3]) {
      inkLeft = Math.min(inkLeft, advance + glyph.bounds[0]);
      inkRight = Math.max(inkRight, advance + glyph.bounds[2]);
      inkTop = Math.max(inkTop, glyph.bounds[3]);
      inkBottom = Math.min(inkBottom, glyph.bounds[1]);
    }
    left = Math.min(left, advance + glyph.bounds[0]);
    right = Math.max(right, advance + glyph.bounds[2]);
    ascent = Math.max(ascent, glyph.bounds[3]);
    descent = Math.max(descent, -glyph.bounds[1]);
    advance += glyph.advance;
  }
  return {
    advance,
    left,
    right,
    ascent,
    descent,
    glyphs,
    ink: inkLeft === Infinity ? null : [inkLeft, inkBottom, inkRight, inkTop],
  };
}
