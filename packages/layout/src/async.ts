import { render } from "@updf/core";
import type { LowerOptions, VDOMChild } from "@updf/core/vdom";
import type { DocumentContentData } from "./document-types.js";
import { layoutPrepared, prepareDocument, type PreparationSignal } from "./internal-preparation.js";
import { serializationOptions } from "./serialization-options.js";

/** Capture and resolve resources before consuming the same operation for layout. */
export async function renderAsync(
  content: DocumentContentData | VDOMChild,
  options: LowerOptions = {},
  preparation: { readonly signal?: PreparationSignal } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const prepared = await prepareDocument(content, options, preparation);
  const result = layoutPrepared(prepared);
  return render(result.document, serializationOptions(result.options));
}
