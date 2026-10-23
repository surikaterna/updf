import type { OperationCapability } from "@updf/core/resources";
import type { InlineSelectionOperation } from "@updf/text/selection";
import { siblingParticipation } from "./sibling.js";
import { pathPolicy } from "./path-policy.js";
import { pathFacade } from "./path.js";
export type { FloatingBlockProps } from "./path-policy.js";
export type { FloatingPathProps } from "./path.js";
export type { SideShape } from "./path-band.js";

/** Explicit path grammar with the same sibling ownership and selection policy. */
export function createPathTextFlow(capability: OperationCapability<InlineSelectionOperation>) {
  const { Block, participation } = siblingParticipation(capability, pathPolicy);
  return Object.freeze({ Block, Path: pathFacade(Block), participation });
}
