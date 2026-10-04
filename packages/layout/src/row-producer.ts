import { exceeds, fail, MetricSum, sum } from "@updf/core/internal";
import { derivedAxis } from "./axis.js";
import { paintContainerSteps } from "./container-paint.js";
import { containerReservation, reserveAncestors } from "./container-reservation.js";
import type { FragmentCall, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import type { RowAlignment } from "./row-types.js";
import { clamp, type Sizing } from "./sizing.js";
import type { StackPiece } from "./stack.js";

export function rowHeight(box: Sizing, columns: readonly PreparedBlock[], path: string): number {
  const tallest = columns.reduce((height, column) => Math.max(height, column.naturalSize.height), 0);
  const natural = sum([box.vertical, tallest]);
  const height = clamp(box.style.height ?? natural, box.style.minHeight, box.style.maxHeight);
  if (exceeds(natural, height)) fail("VERTICAL_OVERFLOW", path, "Row height cannot truncate Columns");
  return height;
}
export function rowProducer(
  box: Sizing,
  columns: readonly PreparedBlock[],
  align: RowAlignment,
  height: number,
  path: string,
): PreparedBlock {
  const prepared: PreparedBlock = {
    fragmentation: "atomic",
    naturalSize: { width: box.width, height },
    extent: 1,
    fragment: (request) => resolveFragment(prepared, request),
    fragmentSteps: (request) => selectRow(box, columns, align, height, request, path),
  };
  return prepared;
}
function* selectRow(
  box: Sizing,
  columns: readonly PreparedBlock[],
  align: RowAlignment,
  height: number,
  request: FragmentRequest,
  path: string,
): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
  if (exceeds(height, request.freshHeight)) fail("VERTICAL_OVERFLOW", path, "Atomic Row exceeds a fresh page");
  if (exceeds(sum([request.usedHeight, height]), request.freshHeight)) return undefined;
  const reserve = containerReservation(box, request, path, { height, hidden: false });
  reserveAncestors(reserve, request.budget, request.state, 0);
  const pieces: StackPiece[] = [];
  const horizontal = new MetricSum();
  for (const column of columns) {
    const capacity = Math.max(1, column.naturalSize.height);
    const fragment = yield {
      block: column,
      request: {
        ...request,
        offset: 0,
        usedHeight: 0,
        freshHeight: capacity,
        availableHeight: capacity,
        atFreshRegion: true,
        width: column.naturalSize.width,
        reserve,
      },
    };
    if (!fragment || fragment.nextOffset !== column.extent || fragment.advance)
      fail("TYPE", path, "Row Columns must be complete and cannot contain page advance controls");
    pieces.push({
      fragment,
      left: horizontal.value,
      top: alignedTop(box, height, fragment.height, align, path),
    });
    horizontal.add(column.naturalSize.width);
    horizontal.add(box.gap);
  }
  return paintedRow(box, pieces, height, path);
}
export function alignedTop(box: Sizing, height: number, extent: number, align: RowAlignment, path: string): number {
  if (align !== "bottom" && align !== "middle") return 0;
  const end = height - box.inset.bottom;
  const nominal = Math.max(0, sum([height, -box.vertical, -extent]));
  const offset = align === "bottom" ? nominal : nominal / 2;
  if (sum([box.inset.top, offset]) + extent <= end) return offset;
  if (box.inset.top + extent >= end) return 0;
  // Invert both native additions: (inset + offset) + extent must fit the content endpoint.
  const lastStart = derivedAxis(extent, end, path).capacity;
  if (lastStart <= box.inset.top) return 0;
  const free = Math.min(nominal, derivedAxis(box.inset.top, lastStart, path).capacity);
  return align === "bottom" ? free : free / 2;
}
function paintedRow(box: Sizing, pieces: readonly StackPiece[], height: number, path: string): PlacedFragment {
  const selection = { pieces, height: height - box.vertical, nextOffset: 1, advance: false };
  const fragment: PlacedFragment = {
    height,
    nextOffset: 1,
    paint: (context) => resolvePaint(fragment, context),
    paintSteps: (context) => paintContainerSteps(box, selection, height, false, context, path),
  };
  return fragment;
}
