import { exceeds, fail } from "@updf/core/internal";
import type { BoxPlacement } from "@updf/layout-boxes/boxes";
import { paintContainerSteps } from "./container-paint.js";
import { prepareContainerPlacements } from "./container-placement.js";
import { containerReservation, reserveAncestors } from "./container-reservation.js";
import { fragmentGeometry } from "./fragment-paint-preparation.js";
import type { FragmentCall, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import type { Sizing } from "./sizing.js";
import type { StackPiece } from "./stack.js";
import { frameFits, selectionContext } from "./selection-request.js";

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
  if (!frameFits(request, height)) {
    if (request.mode !== "complete" && exceeds(height, request.freshHeight))
      fail("VERTICAL_OVERFLOW", path, "Atomic Row exceeds a fresh page");
    return undefined;
  }
  const reserve = containerReservation(box, request, path, { height, hidden: false });
  reserveAncestors(reserve, request.budget, request.state, 0);
  const pieces: StackPiece[] = [];
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    const offset = placement.children[i];
    if (!column || !offset) fail("TYPE", path, "Missing prepared Row placement");
    const fragment = yield {
      block: column,
      request: {
        ...selectionContext(request, 0, column.naturalSize.width),
        mode: "complete",
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
  const placements = prepareContainerPlacements(box, selection, height, false, path);
  const fragment: PlacedFragment = {
    geometry: fragmentGeometry([], placements),
    height,
    nextOffset: 1,
    paint: (context) => resolvePaint({ fragment, context }),
    paintSteps: (context) => paintContainerSteps(box, height, false, context, path),
  };
  return fragment;
}
