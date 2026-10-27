import { render as renderDocument } from "@updf/core";
import type { LowerOptions, VDOMChild } from "@updf/core/vdom";
import type { DocumentContentData } from "./document-types.js";
import { layout } from "./mixed-layout.js";
import { serializationOptions } from "./serialization-options.js";

/**
 * Layout one authored Document, then serialize its fixed document with core.
 * These are independent synchronous operations with independent budgets and
 * snapshots, sharing the caller's configured resources, providers and services.
 */
export function render(content: DocumentContentData | VDOMChild, options: LowerOptions = {}): Uint8Array<ArrayBuffer> {
  const result = layout(content, options);
  return renderDocument(result.document, serializationOptions(options));
}
