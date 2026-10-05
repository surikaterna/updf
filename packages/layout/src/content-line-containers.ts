import { fail, sum } from "@updf/core/internal";
import type { PreparedBlock } from "./protocol.js";
import { sizing } from "./sizing.js";
import type { FlowBlock } from "./types.js";

export interface ContentSize {
  readonly block: PreparedBlock;
  readonly width: number;
}
export function scheduleContainerLines(
  value: FlowBlock,
  size: ContentSize,
  sizes: WeakMap<object, ContentSize>,
  x: number,
  y: number,
  schedule: (
    body: readonly FlowBlock[],
    x: number,
    y: number,
    gap: number,
    alignment?: PreparedBlock["contentAlignment"],
  ) => void,
): void {
  if (value.type !== "block" && value.type !== "column" && value.type !== "row") return;
  const box = sizing(value.style, size.block.naturalSize.width, "/content/style");
  if (value.type !== "row") {
    schedule(value.children, x + box.inset.left, y + box.inset.top, box.gap, size.block.contentAlignment);
    return;
  }
  const placement = size.block.rowPlacement;
  if (!placement) fail("TYPE", "/content", "Missing prepared Row placement");
  for (let i = 0; i < value.children.length; i++) {
    const column = value.children[i];
    const offset = placement.children[i];
    if (!column || !offset) fail("TYPE", "/content", "Missing prepared Column placement");
    const prepared = sizes.get(column)?.block;
    if (!prepared) fail("TYPE", "/content", "Missing prepared Column source");
    schedule([column], sum([x, box.inset.left, offset.left]), sum([y, box.inset.top, offset.top]), 0);
  }
}
