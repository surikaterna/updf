/**
 * `@updf/core`: synchronous portable PDF rendering from fixed-page data.
 * Coordinates use top-left PDF points (72 per inch); no filesystem or layout engine is included.
 * Use `/resources`, `/pdf`, `/painting`, and `/vdom` for their opt-in APIs.
 * Fonts and text services are installed explicitly from optional sibling packages or the host.
 * @module
 */
import { defaultResources } from "./core/default-resources.js";
import { measure } from "./core/measure.js";
import { operation } from "./core/operation.js";
import type { OperationOptions as RenderOptions } from "./core/policy.js";
import { serialize } from "./core/serialize.js";
import { validate } from "./core/validate.js";
import type { DocumentDefinition } from "./types.js";

export { DocumentError } from "./core/error.js";
export type { Limits, OperationOptions, OperationOptions as RenderOptions } from "./core/policy.js";
export { SERVICE_LIMITS } from "./core/policy.js";
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
  TextRun,
  TextStyle,
  XObjectNode,
} from "./types.js";

/**
 * Render a version-1 fixed-page document into fresh PDF bytes without mutating input.
 * Runtime schema, geometry, character, font and budget checks apply even to typed data.
 * Defaults to the trusted budget profile, with no fonts or text service installed; no automatic pagination.
 * @throws {DocumentError} When validation, text fitting, resources or budgets fail.
 */
export function render(document: DocumentDefinition, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  return renderUnknown(document, options);
}

/**
 * Validate unknown document data and render with the same contract as {@link render}.
 * Prefer this boundary for parsed JSON; it does not execute document-supplied code.
 * Use service budgets for bounded workloads, not as a JavaScript sandbox.
 * @throws {DocumentError} With diagnostic codes and escaped JSONPointer paths.
 */
export function renderUnknown(document: unknown, options: RenderOptions = {}): Uint8Array<ArrayBuffer> {
  const { fonts, providers, budget } = operation(options, [], false);
  validate(document, fonts, budget);
  const pages = measure(document, fonts, budget);
  return serialize(pages, defaultResources(pages, providers, fonts.bindings), budget.policy);
}
