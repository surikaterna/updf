import { byteLength, createPreparedFont, type FontBounds, type PreparedFont, type PreparedGlyph } from "@updf/fonts";
import { outlineBounds } from "./bounds.js";
import { mappings } from "./cmap.js";
import { descriptor } from "./metadata.js";
import { Outlines } from "./outline.js";
import { directory, embeddingRights, outlineTables, table } from "./sfnt.js";

/**
 * Experimental static TrueType preparation, without Fontkit or shaping.
 * Copies at most 4 MiB. Requires Unicode cmap 4/12, OS/2 v2–5, name format 0,
 * and XY composites with unscaled offsets. See README for budgets and exclusions.
 * Full embedding only; declared embedding rights are checked, not granted.
 * Structural validation is not a malicious-font or TrueType-bytecode sandbox.
 */
export function prepareFont(bytes: Uint8Array<ArrayBuffer>): PreparedFont {
  byteLength(bytes, "/font/bytes", 4 * 1024 * 1024);
  const owned = new Uint8Array(bytes);
  const tables = directory(owned),
    rights = embeddingRights(tables),
    outlines = outlineTables(tables);
  const reader = new Outlines(outlines),
    glyphs: PreparedGlyph[] = [];
  const inventory = mappings(table(tables, "cmap", 4), outlines.count);
  const bounds = new Map<number, FontBounds>();
  for (const [codePoint, glyphId] of inventory) {
    let ink = bounds.get(glyphId);
    if (!ink) {
      ink = outlineBounds(reader.get(glyphId));
      bounds.set(glyphId, ink);
    }
    glyphs.push({
      codePoint,
      glyphId,
      advance: outlines.hmtx.u16(Math.min(glyphId, outlines.metrics - 1) * 4),
      bounds: ink,
    });
  }
  return createPreparedFont({
    version: 1,
    format: "static-truetype",
    bytes: owned,
    embeddingRights: rights,
    unitsPerEm: table(tables, "head", 54).u16(18),
    glyphCount: outlines.count,
    descriptor: descriptor(tables),
    glyphs,
  });
}
