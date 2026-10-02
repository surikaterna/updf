import { fail } from "../core/error.js";
import type { MeasuredLine, MeasuredText } from "../core/plan.js";
import type { TextNode } from "../types.js";
import { glyphRun } from "./profile.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

interface Run {
  advance: number;
  left: number;
  right: number;
  ascent: number;
  descent: number;
  glyphs: readonly PreparedGlyph[];
}

function run(text: string, font: PreparedFont, path: string): Run {
  const glyphs = glyphRun(text, font, path);
  let advance = 0;
  let left = 0;
  let right = 0;
  let ascent = 0;
  let descent = 0;
  for (const glyph of glyphs) {
    left = Math.min(left, advance + glyph.bounds[0]);
    right = Math.max(right, advance + glyph.bounds[2]);
    ascent = Math.max(ascent, glyph.bounds[3]);
    descent = Math.max(descent, -glyph.bounds[1]);
    advance += glyph.advance;
  }
  return { advance, left, right, ascent, descent, glyphs };
}

function width(text: string, font: PreparedFont, size: number, path: string): number {
  return (run(text, font, path).advance / font.metadata.unitsPerEm) * size;
}

function wrap(paragraph: string, node: TextNode, font: PreparedFont, path: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (const token of paragraph.match(/ +|[^ ]+/g) ?? []) {
    if (width(token, font, node.fontSize, path) > node.width)
      fail("TOKEN_OVERFLOW", path, "A selected-font token exceeds box width");
    if (width(current + token, font, node.fontSize, path) > node.width) {
      lines.push(current);
      current = token;
    } else current += token;
  }
  lines.push(current);
  return lines;
}

function line(text: string, i: number, node: TextNode, font: PreparedFont, ascent: number, path: string): MeasuredLine {
  const metrics = run(text, font, path);
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

export function measureFontText(node: TextNode, font: PreparedFont, path: string): MeasuredText {
  const lines = node.text === "" ? [] : node.text.split("\n").flatMap((paragraph) => wrap(paragraph, node, font, path));
  if (lines.length > Math.floor(node.height / node.lineHeight))
    fail("VERTICAL_OVERFLOW", path, "Text exceeds the text box height");
  const metrics = run(node.text.replaceAll("\n", ""), font, path);
  const ascent = (metrics.ascent / font.metadata.unitsPerEm) * node.fontSize;
  const descent = (metrics.descent / font.metadata.unitsPerEm) * node.fontSize;
  if (ascent + descent > node.lineHeight) fail("FONT_INK", path, "Selected glyph ascent/descent exceeds lineHeight");
  // Center the selected ink envelope in each full line box. Spare leading also
  // avoids pinning outlines to a page edge where raster hinting can round outward.
  const baseline = ascent + (node.lineHeight - ascent - descent) / 2;
  return { ...node, preparedFont: font, lines: lines.map((text, i) => line(text, i, node, font, baseline, path)) };
}
