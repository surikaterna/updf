import { isContentData, validateDataObject as record, snapshotData } from "@updf/core/internal";
import type { BlockInput, ContainerBlock } from "./container-types.js";
import { isDecorationPlan } from "./decorations.js";
import { isExtensionBlock } from "./extensions.js";

export function block(input: BlockInput): ContainerBlock {
  record(input, ["children", "style", "keepTogether", "decorations"], "/block");
  return snapshotData(
    { ...input, type: "block" as const },
    "/block",
    (value) => isExtensionBlock(value) || isDecorationPlan(value) || isContentData(value),
  );
}
