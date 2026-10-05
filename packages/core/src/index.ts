import { defaultResources } from "./core/default-resources.js";
import { measure } from "./core/measure.js";
import { operation } from "./core/operation.js";
import { serialize } from "./core/serialize.js";
import { validate } from "./core/validate.js";
import type { RenderOptions } from "./fonts/types.js";
import type { DocumentDefinition } from "./types.js";

export { DocumentError } from "./core/error.js";
export type { Limits, OperationOptions } from "./core/policy.js";
export { SERVICE_LIMITS } from "./core/policy.js";
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
  ParagraphDefinition,
  PathCommand,
  PathNode,
  RectangleNode,
  RGB,
  RichTextNode,
  SourceSpan,
  TextAlign,
  TextNode,
  TextRun,
  TextStyle,
} from "./types.js";

/** Typed native template API; runtime geometry/character/resource checks still apply. */
export function render(document: DocumentDefinition, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  return renderUnknown(document, options);
}

/** JSON/untrusted data boundary with the same structured diagnostics as render. */
export function renderUnknown(document: unknown, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  const { fonts, budget } = operation(options, [], false);
  validate(document, fonts, budget);
  const pages = measure(document, fonts, budget);
  return serialize(pages, defaultResources(pages), budget.policy);
}
