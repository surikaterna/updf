import { exceeds, fail, sum } from "@updf/core/internal";
import type { BoxPlacement } from "@updf/layout-boxes/boxes";
import { paintContainerSteps } from "./container-paint.js";
import { containerReservation, reserveAncestors } from "./container-reservation.js";
import type { FragmentCall, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import type { Sizing } from "./sizing.js";
import type { StackPiece } from "./stack.js";

export function rowProducer(
  box: Sizing,
  columns: readonly PreparedBlock[],
  placement: BoxPlacement,
  path: string,
): PreparedBlock {
  const height = placement.height;
  const prepared: PreparedBlock = {
    rowPlacement: placement,
    ...(columns.some((column) => column.containsAutoAlignment) ? { containsAutoAlignment: true } : {}),
    fragmentation: "atomic",
    naturalSize: { width: box.width, height },
    extent: 1,
    fragment: (request) => resolveFragment(prepared, request),
    fragmentSteps: (request) => selectRow(box, columns, placement, height, request, path),
  };
  return prepared;
}
function* selectRow(
  box: Sizing,
  columns: readonly PreparedBlock[],
  placement: BoxPlacement,
  height: number,
  request: FragmentRequest,
  path: string,
): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
  if (exceeds(height, request.freshHeight)) fail("VERTICAL_OVERFLOW", path, "Atomic Row exceeds a fresh page");
  if (exceeds(sum([request.usedHeight, height]), request.freshHeight)) return undefined;
  const reserve = containerReservation(box, request, path, { height, hidden: false });
  reserveAncestors(reserve, request.budget, request.state, 0);
  const pieces: StackPiece[] = [];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const offset = placement.children[i];
    if (!column || !offset) fail("TYPE", path, "Missing prepared Row placement");
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
    if (fragment.height !== column.naturalSize.height)
      fail("TYPE", path, "Complete Row Column must match its prepared height");
    pieces.push({
      fragment,
      left: offset.left,
      top: offset.top,
    });
  }
  return paintedRow(box, pieces, height, path);
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
