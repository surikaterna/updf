/**
 * `@updf/fonts`: own validated prepared TrueType data without importing a font parser.
 * Install handles, a font runtime and its provider explicitly; font bytes remain private.
 * @module
 */
export { byteLength } from "./checks.js";
export { createPreparedFont, isPreparedFont } from "./prepare.js";
export { scalar } from "./profile.js";
export { fontProvider } from "./provider.js";
export type { Helvetica } from "./runtime.js";
export { createHelvetica, fontRuntime } from "./runtime.js";
export type {
  FontBounds,
  FontDescriptor,
  FontMetadata,
  FontResources,
  PreparedFont,
  PreparedFontInput,
  PreparedGlyph,
} from "./types.js";
