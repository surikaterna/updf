import type { OwnedResource } from "@updf/core/resources";

export type FontBounds = readonly [number, number, number, number];
export interface PreparedGlyph {
  readonly codePoint: number;
  readonly glyphId: number;
  /** Horizontal advance and ink bounds in unscaled font units; no kerning. */
  readonly advance: number;
  readonly bounds: FontBounds;
}
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
export interface PreparedFontInput extends Omit<FontMetadata, "byteLength"> {
  readonly bytes: Uint8Array<ArrayBuffer>;
}

export type PreparedFont = OwnedResource<FontMetadata>;
export type FontResources = Readonly<Record<string, PreparedFont>>;
