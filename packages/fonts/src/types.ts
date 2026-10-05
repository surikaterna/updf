import type { OwnedResource } from "@updf/core/resources";

/** [xMin, yMin, xMax, yMax] in unscaled font units, with font-space upward y. */
export type FontBounds = readonly [number, number, number, number];
/** Mapping for one unique Unicode scalar to a nonzero glyph; no shaping or kerning. */
export interface PreparedGlyph {
  readonly codePoint: number;
  readonly glyphId: number;
  /** Horizontal advance and ink bounds in unscaled font units; no kerning. */
  readonly advance: number;
  readonly bounds: FontBounds;
}
/** PDF font descriptor; dimensions use font units except stemV (1000-em) and italicAngle (degrees). */
export interface FontDescriptor {
  readonly postscriptName: string;
  readonly bounds: FontBounds;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly italicAngle: number;
  /** PDF descriptor stem estimate, in 1000-em units. */
  readonly stemV: number;
  readonly flags: number;
}
/** Deeply frozen prepared-font metadata; declared rights are not independently inferred from bytes. */
export interface FontMetadata {
  readonly version: 1;
  readonly format: "static-truetype";
  readonly unitsPerEm: number;
  readonly glyphCount: number;
  readonly embeddingRights: "installable" | "editable" | "preview-print";
  readonly descriptor: FontDescriptor;
  readonly glyphs: readonly PreparedGlyph[];
  readonly byteLength: number;
}
/** Host-prepared static TrueType program and corresponding metrics, copied on preparation. */
export interface PreparedFontInput extends Omit<FontMetadata, "byteLength"> {
  readonly bytes: Uint8Array<ArrayBuffer>;
}

/** Opaque library-owned handle. Structural lookalikes/casts fail runtime ownership checks. */
export type PreparedFont = OwnedResource<FontMetadata>;
/** Font ID to owned handle mapping; IDs match [A-Za-z][A-Za-z0-9_-]{0,63}. Helvetica is explicitly installed. */
export type FontResources = Readonly<Record<string, PreparedFont>>;
