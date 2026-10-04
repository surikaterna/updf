import { MetricSum, sum } from "@updf/core/internal";
import type { PreparedBlock } from "./protocol.js";
import { alignedTop } from "./row-producer.js";
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
  schedule: (body: readonly FlowBlock[], x: number, y: number, gap: number) => void,
): void {
  if (value.type !== "block" && value.type !== "column" && value.type !== "row") return;
  const box = sizing(value.style, size.block.naturalSize.width, "/content/style");
  if (value.type !== "row") {
    schedule(value.children, x + box.inset.left, y + box.inset.top, box.gap);
    return;
  }
  const horizontal = new MetricSum();
  for (const column of value.children) {
    const prepared = sizes.get(column)?.block;
    if (!prepared) continue;
    const offset = alignedTop(
      box,
      size.block.naturalSize.height,
      prepared.naturalSize.height,
      value.align ?? "top",
      "/content",
    );
    schedule([column], sum([x, box.inset.left, horizontal.value]), sum([y, box.inset.top, offset]), 0);
    horizontal.add(prepared.naturalSize.width);
    horizontal.add(box.gap);
  }
}
