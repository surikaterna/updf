import { fail } from "../core/error.js";
import { array, bounds, byteLength, fontLimits, numeric, record } from "./checks.js";
import {
  type FontDescriptor,
  type FontMetadata,
  type PreparedFont,
  type PreparedGlyph,
  preparedBrand,
} from "./types.js";

interface Storage {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly glyphs: ReadonlyMap<number, PreparedGlyph>;
}
const storage = new WeakMap<object, Storage>();

function descriptor(value: unknown): FontDescriptor {
  const path = "/font/descriptor";
  record(value, path, ["postscriptName", "bounds", "ascent", "descent", "capHeight", "italicAngle", "stemV", "flags"]);
  if (typeof value.postscriptName !== "string" || !/^[A-Za-z][A-Za-z0-9_.+-]{0,127}$/.test(value.postscriptName))
    fail("FONT_DATA", `${path}/postscriptName`, "Invalid PostScript name");
  const flags = numeric(value.flags, `${path}/flags`, 0, 0x7fffffff);
  if (!(flags & 32) || (flags & ~0x70063) !== 0)
    fail("FONT_DATA", `${path}/flags`, "Expected nonsymbolic Latin/Cyrillic descriptor flags");
  return Object.freeze({
    postscriptName: value.postscriptName,
    bounds: bounds(value.bounds, `${path}/bounds`),
    ascent: numeric(value.ascent, `${path}/ascent`, 0, 32767),
    descent: numeric(value.descent, `${path}/descent`, -32768, 0),
    capHeight: numeric(value.capHeight, `${path}/capHeight`, 0, 32767),
    italicAngle: numeric(value.italicAngle, `${path}/italicAngle`, -90, 90, false),
    stemV: numeric(value.stemV, `${path}/stemV`, 1, 1000, false),
    flags,
  });
}

function glyphs(value: unknown, glyphCount: number, fontBox: FontDescriptor["bounds"]): readonly PreparedGlyph[] {
  array(value, fontLimits.mappings, "/font/glyphs");
  const seen = new Set<number>();
  return Object.freeze(
    value.map((entry, i) => {
      const path = `/font/glyphs/${i}`;
      record(entry, path, ["codePoint", "glyphId", "advance", "bounds"]);
      const codePoint = numeric(entry.codePoint, `${path}/codePoint`, 0, 0x10ffff);
      if ((codePoint >= 0xd800 && codePoint <= 0xdfff) || seen.has(codePoint))
        fail("FONT_DATA", `${path}/codePoint`, "Expected unique Unicode scalar");
      seen.add(codePoint);
      const ink = bounds(entry.bounds, `${path}/bounds`);
      if (ink[0] < fontBox[0] || ink[1] < fontBox[1] || ink[2] > fontBox[2] || ink[3] > fontBox[3])
        fail("FONT_DATA", `${path}/bounds`, "Glyph lies outside descriptor bounds");
      return Object.freeze({
        codePoint,
        glyphId: numeric(entry.glyphId, `${path}/glyphId`, 1, glyphCount - 1),
        advance: numeric(entry.advance, `${path}/advance`, 0, 65535),
        bounds: ink,
      });
    }),
  );
}

/** Validates prepared data, not the TTF program or metric/program correspondence. */
export function createPreparedFont(input: unknown): PreparedFont {
  record(input, "/font", [
    "version",
    "format",
    "unitsPerEm",
    "glyphCount",
    "embeddingRights",
    "descriptor",
    "glyphs",
    "bytes",
  ]);
  if (input.version !== 1 || input.format !== "static-truetype")
    fail("FONT_DATA", "/font/format", "Expected version1 static TrueType prepared data");
  if (
    input.embeddingRights !== "installable" &&
    input.embeddingRights !== "editable" &&
    input.embeddingRights !== "preview-print"
  )
    fail("FONT_DATA", "/font/embeddingRights", "Embedding is restricted or unsupported");
  const size = byteLength(input.bytes, "/font/bytes");
  const unitsPerEm = numeric(input.unitsPerEm, "/font/unitsPerEm", 16, 16384);
  const glyphCount = numeric(input.glyphCount, "/font/glyphCount", 2, 65535);
  const desc = descriptor(input.descriptor);
  const entries = glyphs(input.glyphs, glyphCount, desc.bounds);
  // All budgets/metadata are checked before copying any font program allocation.
  if (!(input.bytes instanceof Uint8Array)) fail("FONT_DATA", "/font/bytes", "Invalid font bytes");
  const bytes = new Uint8Array(input.bytes);
  const metadata: FontMetadata = Object.freeze({
    version: 1,
    format: "static-truetype",
    unitsPerEm,
    glyphCount,
    embeddingRights: input.embeddingRights,
    descriptor: desc,
    glyphs: entries,
    byteLength: size,
  });
  const handle = Object.freeze({ [preparedBrand]: true, metadata } satisfies PreparedFont);
  storage.set(handle, { bytes, glyphs: new Map(entries.map((glyph) => [glyph.codePoint, glyph])) });
  return handle;
}

export function isPreparedFont(value: unknown): value is PreparedFont {
  return typeof value === "object" && value !== null && storage.has(value);
}

export function glyphFor(font: PreparedFont, codePoint: number, path: string): PreparedGlyph {
  const glyph = storage.get(font)?.glyphs.get(codePoint);
  if (!glyph)
    fail(
      "GLYPH_MISSING",
      path,
      `${font.metadata.descriptor.postscriptName} has no glyph for U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`,
    );
  return glyph;
}

/** Internal serializer access returns a copy, never mutable owned storage. */
export function copyProgram(font: PreparedFont): Uint8Array<ArrayBuffer> {
  const data = storage.get(font);
  if (!data) fail("FONT_RESOURCE", "/resources", "Unowned prepared font");
  return new Uint8Array(data.bytes);
}
