import { fail } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import { allocateBoxLayout, finishBoxLayout, type BoxLayoutPlan, type BoxView } from "@updf/layout-boxes/boxes";
import { columnSizing } from "./column-sizing.js";
import type { PreparedBlock } from "./protocol.js";
import { boxStyle, trackStyle } from "./row-boxes.js";
import type { Sizing } from "./sizing.js";
import { stackHeight } from "./stack.js";

export function columnAllocation(value: Record<string, unknown>, width: number, path: string) {
  const allocatedWidth = columnTrackWidth(value.width ?? undefined, width, path);
  const box = columnSizing(value, allocatedWidth, path);
  const view: BoxView<number, number> = {
    id: () => "column",
    path: () => path,
    style: () => ({ ...boxStyle(box), width: box.width }),
    childCount: () => 0,
    childAt: () => 0,
    content: () => 0,
  };
  const plan = columnKernel(() => allocateBoxLayout({ root: 0, view, width: box.width, containment: "metric" }), true);
  return { box: { ...box, contentWidth: plan.requests[0]!.allocation.width }, plan };
}

function columnTrackWidth(input: unknown, width: number, path: string): number {
  const style = trackStyle(input, `${path}/tracks/0`);
  // This unauthored Row supplies only single-track width allocation, never a page viewport.
  const view: BoxView<number, number> = {
    id: (node) => String(node),
    path: () => path,
    style: (node) => (node === -1 ? { width, flexDirection: "row" } : style),
    childCount: (node) => (node === -1 ? 1 : 0),
    childAt: () => 0,
    content: (node) => (node === -1 ? undefined : node),
  };
  const plan = columnKernel(() => allocateBoxLayout({ root: -1, view, width, containment: "metric" }), true);
  // Preserve the issued border width exactly; reconstructing it from inset subtraction loses bits.
  return plan.requests[0]!.allocation.width;
}

export function columnGeometry(
  box: Sizing,
  children: readonly PreparedBlock[],
  plan: BoxLayoutPlan<number>,
  path: string,
) {
  const bodyHeight = stackHeight(children, box.gap);
  if (!Number.isFinite(bodyHeight)) fail("GEOMETRY", path, "Natural Column height must be finite");
  const layout = columnKernel(
    () => finishBoxLayout(plan, [{ request: plan.requests[0]!, height: bodyHeight }]),
    false,
    box.style.overflow === "hidden",
  );
  return { bodyHeight, height: layout.boxes[0]!.height };
}

function columnKernel<T>(run: () => T, preflight: boolean, hidden = false): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof LayoutInputError) {
      const overflow =
        !preflight &&
        (error.message === "Box height cannot truncate content" ||
          (error.message === "Box height must reserve vertical insets" && !hidden));
      fail(overflow ? "VERTICAL_OVERFLOW" : error.code, error.path, error.message);
    }
    throw error;
  }
}
