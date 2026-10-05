import { fail } from "@updf/core/internal";
import { type FontBounds, type FontMetadata, type PreparedFontInput, type PreparedGlyph, scalar } from "@updf/fonts";

interface ParsedFont {
  readonly postscriptName: string;
  readonly unitsPerEm: number;
  readonly numGlyphs: number;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly italicAngle: number;
  readonly bbox: unknown;
  readonly characterSet: unknown;
  glyphForCodePoint(code: number): unknown;
}

function isFont(value: unknown): value is ParsedFont {
  return (
    typeof value === "object" &&
    value !== null &&
    "postscriptName" in value &&
    typeof value.postscriptName === "string" &&
    "unitsPerEm" in value &&
    typeof value.unitsPerEm === "number" &&
    "numGlyphs" in value &&
    typeof value.numGlyphs === "number" &&
    "ascent" in value &&
    typeof value.ascent === "number" &&
    "descent" in value &&
    typeof value.descent === "number" &&
    "capHeight" in value &&
    typeof value.capHeight === "number" &&
    "italicAngle" in value &&
    typeof value.italicAngle === "number" &&
    "bbox" in value &&
    "characterSet" in value &&
    "glyphForCodePoint" in value &&
    typeof value.glyphForCodePoint === "function"
  );
}

function bounds(value: unknown): FontBounds {
  if (
    !value ||
    typeof value !== "object" ||
    !("minX" in value) ||
    !("minY" in value) ||
    !("maxX" in value) ||
    !("maxY" in value)
  )
    fail("FONT_FORMAT", "/font/metrics", "Missing public bounding box");
  const { minX, minY, maxX, maxY } = value;
  if (minX === Infinity && minY === Infinity && maxX === -Infinity && maxY === -Infinity) return [0, 0, 0, 0];
  if (
    typeof minX !== "number" ||
    typeof minY !== "number" ||
    typeof maxX !== "number" ||
    typeof maxY !== "number" ||
    ![minX, minY, maxX, maxY].every(Number.isFinite)
  )
    fail("FONT_FORMAT", "/font/metrics", "Invalid public bounding box");
  return [Math.floor(minX), Math.floor(minY), Math.ceil(maxX), Math.ceil(maxY)];
}

function supported(code: unknown): code is number {
  if (
    typeof code !== "number" ||
    !Number.isInteger(code) ||
    code < 0 ||
    code > 0x10ffff ||
    (code >= 0xd800 && code <= 0xdfff) ||
    code === 10
  )
    return false;
  try {
    scalar(String.fromCodePoint(code), "/font/profile");
    return true;
  } catch {
    return false;
  }
}

function glyphs(font: ParsedFont): PreparedGlyph[] {
  const set = font.characterSet;
  if (!Array.isArray(set) || set.length > 65536)
    fail("LIMIT", "/font/characterSet", "Invalid/excessive font inventory");
  const codes = new Set<number>();
  for (const candidate of set) {
    const code: unknown = candidate;
    if (supported(code)) codes.add(code);
  }
  const result: PreparedGlyph[] = [];
  for (const codePoint of [...codes].sort((a, b) => a - b)) {
    const glyph = font.glyphForCodePoint(codePoint);
    if (
      !glyph ||
      typeof glyph !== "object" ||
      !("id" in glyph) ||
      !("advanceWidth" in glyph) ||
      !("bbox" in glyph) ||
      typeof glyph.id !== "number" ||
      typeof glyph.advanceWidth !== "number"
    )
      fail("FONT_FORMAT", "/font/glyphs", "Invalid public glyph metrics");
    if (glyph.id)
      result.push({ codePoint, glyphId: glyph.id, advance: glyph.advanceWidth, bounds: bounds(glyph.bbox) });
  }
  return result;
}

export function preparedData(
  parsed: unknown,
  bytes: Uint8Array<ArrayBuffer>,
  embeddingRights: FontMetadata["embeddingRights"],
): PreparedFontInput {
  if (!isFont(parsed)) fail("FONT_FORMAT", "/font", "Expected a single Fontkit face with public metrics API");
  return {
    version: 1,
    format: "static-truetype",
    bytes,
    embeddingRights,
    unitsPerEm: parsed.unitsPerEm,
    glyphCount: parsed.numGlyphs,
    glyphs: glyphs(parsed),
    descriptor: {
      postscriptName: parsed.postscriptName,
      bounds: bounds(parsed.bbox),
      ascent: parsed.ascent,
      descent: parsed.descent,
      capHeight: parsed.capHeight,
      italicAngle: parsed.italicAngle,
      stemV: 80,
      flags: 32 | (parsed.italicAngle ? 64 : 0),
    },
  };
}
