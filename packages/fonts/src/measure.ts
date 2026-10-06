import { glyphRun } from "./profile.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

export interface FontRunMetrics {
  advance: number;
  glyphs: readonly PreparedGlyph[];
  ink: readonly [number, number, number, number] | null;
}

export function fontRun(text: string, font: PreparedFont, path: string): FontRunMetrics {
  const glyphs = glyphRun(text, font, path);
  let advance = 0;
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
    advance += glyph.advance;
  }
  return {
    advance,
    glyphs,
    ink: inkLeft === Infinity ? null : [inkLeft, inkBottom, inkRight, inkTop],
  };
}
