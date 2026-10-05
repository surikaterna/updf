/**
 * `@updf/core/fonts`: own validated prepared TrueType data without importing a font parser.
 * Pass handles to core operations via options.resources; font bytes remain private.
 * @module
 */
export { createPreparedFont } from "./prepare.js";
export type {
  FontBounds,
  FontDescriptor,
  FontMetadata,
  FontResources,
  PreparedFont,
  PreparedFontInput,
  PreparedGlyph,
  RenderOptions,
} from "./types.js";
