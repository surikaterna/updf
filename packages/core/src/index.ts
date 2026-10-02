import { measure } from "./core/measure.js";
import { serialize } from "./core/serialize.js";
import { validate } from "./core/validate.js";
import { resolveResources } from "./fonts/resources.js";
import type { RenderOptions } from "./fonts/types.js";
import type { DocumentDefinition } from "./types.js";

export { DocumentError } from "./core/error.js";
export type { FontResources, PreparedFont, RenderOptions } from "./fonts/types.js";
export type {
  Box,
  ClipRect,
  CloseCommand,
  CubicCommand,
  DiagnosticCode,
  DocumentDefinition,
  DocumentDiagnostic,
  LineCommand,
  LineNode,
  Matrix,
  MoveCommand,
  NodeDefinition,
  PageDefinition,
  Paint,
  Painting,
  PaintingGroupNode,
  PathCommand,
  PathNode,
  RectangleNode,
  RGB,
  SourceSpan,
  TextAlign,
  TextNode,
} from "./types.js";

/** Typed native template API; runtime geometry/character/resource checks still apply. */
export function render(document: DocumentDefinition, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  return renderUnknown(document, options);
}

/** JSON/untrusted data boundary with the same structured diagnostics as render. */
export function renderUnknown(document: unknown, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  const fonts = resolveResources(options);
  validate(document, fonts);
  return serialize(measure(document, fonts));
}
