import { fail } from "../core/error.js";
import type { MeasuredLine, MeasuredText } from "../core/plan.js";
import { ledger, type WorkLedger, work } from "../measurement/ledger.js";
import type { TextNode } from "../types.js";
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

function width(text: string, font: PreparedFont, size: number, path: string): number {
  return (fontRun(text, font, path).advance / font.metadata.unitsPerEm) * size;
}

function wrap(paragraph: string, node: TextNode, font: PreparedFont, path: string, budget: WorkLedger): string[] {
  const lines: string[] = [];
  let current = "";
  for (const token of paragraph.match(/ +|[^ ]+/g) ?? []) {
    if (width(token, font, node.fontSize, path) > node.width)
      fail("TOKEN_OVERFLOW", path, "A selected-font token exceeds box width");
    if (width(current + token, font, node.fontSize, path) > node.width) {
      work(budget, 2, path);
      lines.push(current);
      current = token;
    } else current += token;
  }
  work(budget, 2, path);
  lines.push(current);
  return lines;
}

function line(text: string, i: number, node: TextNode, font: PreparedFont, ascent: number, path: string): MeasuredLine {
  const metrics = fontRun(text, font, path);
  const em = font.metadata.unitsPerEm;
  const advance = (metrics.advance / em) * node.fontSize;
  const spare = node.width - advance;
  const offset = node.align === "center" ? spare / 2 : node.align === "right" ? spare : 0;
  const tolerance = Number.EPSILON * Math.max(1, node.width, node.fontSize) * 16;
  if (
    offset + (metrics.left / em) * node.fontSize < -tolerance ||
    offset + (metrics.right / em) * node.fontSize > node.width + tolerance
  ) {
    fail("FONT_INK", path, "Selected glyph horizontal ink exceeds the text box; adjust alignment/box");
  }
  return { text, x: node.x + offset, y: node.y + i * node.lineHeight + ascent, glyphs: metrics.glyphs };
}

export function measureFontText(
  node: TextNode,
  font: PreparedFont,
  path: string,
  budget: WorkLedger = ledger(),
): MeasuredText {
  const lines =
    node.text === "" ? [] : node.text.split("\n").flatMap((paragraph) => wrap(paragraph, node, font, path, budget));
  if (lines.length > Math.floor(node.height / node.lineHeight))
    fail("VERTICAL_OVERFLOW", path, "Text exceeds the text box height");
  const metrics = fontRun(node.text.replaceAll("\n", ""), font, path);
  const ascent = (metrics.ascent / font.metadata.unitsPerEm) * node.fontSize;
  const descent = (metrics.descent / font.metadata.unitsPerEm) * node.fontSize;
  if (ascent + descent > node.lineHeight) fail("FONT_INK", path, "Selected glyph ascent/descent exceeds lineHeight");
  // Center the selected ink envelope in each full line box. Spare leading also
  // avoids pinning outlines to a page edge where raster hinting can round outward.
  const baseline = ascent + (node.lineHeight - ascent - descent) / 2;
  return { ...node, preparedFont: font, lines: lines.map((text, i) => line(text, i, node, font, baseline, path)) };
}
