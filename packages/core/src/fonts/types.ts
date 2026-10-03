import type { OperationOptions } from "../core/policy.js";

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

// The brand is not exported as a runtime value; WeakMap ownership also rejects forgeries.
export const preparedBrand: unique symbol = Symbol("PreparedFont");
export interface PreparedFont {
  readonly [preparedBrand]: true;
  readonly metadata: FontMetadata;
}
export type FontResources = Readonly<Record<string, PreparedFont>>;
export type RenderOptions = OperationOptions;
