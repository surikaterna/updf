import { createOperationCapability } from "@updf/core/internal";
import { serviceClosure, type TextServiceOptions } from "./service.js";
import { inlineSelection } from "./inline-selection.js";
import { compositionWork } from "./composition-work.js";
import { defineServiceRequest } from "./service-request.js";
export type {
  InlineContinuation,
  InlineSelection,
  SelectedInlineLine,
  InlineSelectionOperation,
} from "./inline-selection-types.js";
export type { TextServiceOptions } from "./service.js";

/** Selection logic is imported by the feature, not by the ordinary text service. */
export const inlineSelectionRequest = defineServiceRequest((scope, fonts) =>
  inlineSelection(scope, fonts, compositionWork(scope)),
);

/** Selection-only capability over one existing service closure and its owned fonts. */
export function createTextSelection(options: TextServiceOptions) {
  const { service, fonts } = serviceClosure(options);
  return Object.freeze({
    text: service,
    capability: createOperationCapability((scope) => inlineSelection(scope, fonts, compositionWork(scope))),
  });
}
