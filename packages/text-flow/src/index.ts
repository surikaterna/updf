import type { OperationCapability } from "@updf/core/resources";
import type { InlineSelectionOperation } from "@updf/text/selection";
import { siblingParticipation, type SiblingBlockProps } from "./sibling.js";
import { rectanglePolicy } from "./rectangle-policy.js";
export interface FloatingBlockProps extends SiblingBlockProps<"rect"> {}

/** Rectangle-only sibling participation; no atomic composer or path grammar. */
export function createTextFlow(capability: OperationCapability<InlineSelectionOperation>) {
  return Object.freeze(siblingParticipation(capability, rectanglePolicy));
}
