import { exceeds, fail, sum } from "@updf/core/internal";
import { derivedAxis } from "./axis.js";
import { paintContainerSteps } from "./container-paint.js";
import { prepareContainerPlacements, containerChildOrigin } from "./container-placement.js";
import { liftDirectVisualReference } from "./visual-reference.js";
import { containerReservation, reserveAncestors } from "./container-reservation.js";
import { fragmentGeometry } from "./fragment-paint-preparation.js";
import type { AncestorReservation, FragmentCall, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import { clamp, type Sizing } from "./sizing.js";
import { type Stack, type StackSelection, selectStackSteps, stack, stackHeight } from "./stack.js";
import { frameFits, selectionContext } from "./selection-request.js";

function contentCapacity(box: Sizing, height: number, path: string): number {
  if (height <= box.vertical) return 0;
  return derivedAxis(box.inset.top, height - box.inset.bottom, path).capacity;
}
/** Metric content dimension; native contentCapacity is a separate certificate. */
export function definiteContentHeight(box: Sizing, path: string): number | undefined {
  if (box.style.height === undefined) return undefined;
  const height = clamp(box.style.height, box.style.minHeight, box.style.maxHeight);
  if (height < box.vertical) fail("GEOMETRY", path, "Height cannot erase padding/border reservations");
  return height - box.vertical;
}
function* splittable(
  box: Sizing,
  content: Stack,
  request: FragmentRequest,
  path: string,
): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
  if (request.mode !== "complete" && exceeds(sum([request.usedHeight, box.vertical]), request.freshHeight))
    return undefined;
  const reserve = containerReservation(box, request, path);
  const local = contentRequest(box, request, reserve, path);
  reserveAncestors(reserve, request.budget, request.state, 0);
  const selected = yield* selectStackSteps(content, local);
  if (!selected) return undefined;
  const height = sum([box.vertical, selected.height]);
  reserveAncestors(reserve, request.budget, request.state, selected.height);
  const fragmentBox = {
    ...box,
    borders: {
      ...box.borders,
      ...(request.offset === 0 ? {} : { borderTop: null }),
      ...(selected.nextOffset === content.extent ? {} : { borderBottom: null }),
    },
  };
  return painted(fragmentBox, selected, height, false, path, selected.nextOffset);
}
function contentRequest(
  box: Sizing,
  request: FragmentRequest,
  reserve: AncestorReservation,
  path: string,
): FragmentRequest {
  if (request.mode === "complete")
    return { ...selectionContext(request, request.offset, box.contentWidth), mode: "complete", reserve };
  const capacity = contentCapacity(box, request.freshHeight, path);
  return {
    ...request,
    freshHeight: capacity,
    availableHeight: capacity - request.usedHeight,
    width: box.contentWidth,
    reserve,
    definiteAlignment: false,
  };
}
function* atomic(
  box: Sizing,
  content: Stack,
  height: number,
  hidden: boolean,
  request: FragmentRequest,
  path: string,
  alignment: PreparedBlock["contentAlignment"],
): Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined> {
  if (!frameFits(request, height)) return undefined;
  const reserve = containerReservation(box, request, path, { height, hidden });
  reserveAncestors(reserve, request.budget, request.state, 0);
  const selected = yield* selectStackSteps(content, closedRequest(box, request, reserve, alignment));
  if (!selected || selected.nextOffset !== content.extent || selected.advance)
    fail("TYPE", path, "Closed/kept blocks cannot contain page advance controls");
  if (height === 0 && selected.height > 0)
    fail("GEOMETRY", path, "Zero-height container cannot discard positive content");
  if (hidden && height <= (box.borders.borderTop?.width ?? 0) + (box.borders.borderBottom?.width ?? 0))
    fail("GEOMETRY", path, "Hidden content requires a positive padding-edge clip");
  return painted(box, selected, height, hidden, path, 1);
}
function closedRequest(
  box: Sizing,
  request: FragmentRequest,
  reserve: AncestorReservation,
  alignment: PreparedBlock["contentAlignment"],
): FragmentRequest {
  const context = { ...selectionContext(request, 0, box.contentWidth), reserve };
  if (!alignment) return { ...context, mode: "complete" };
  return {
    ...context,
    freshHeight: alignment.capacity,
    availableHeight: alignment.capacity,
    usedHeight: 0,
    atFreshRegion: true,
    definiteAlignment: true,
    alignmentHeight: alignment.height,
  };
}
function painted(
  box: Sizing,
  selection: StackSelection,
  height: number,
  hidden: boolean,
  path: string,
  nextOffset: number,
): PlacedFragment {
  const placements = prepareContainerPlacements(box, selection, height, hidden, path);
  const fragment: PlacedFragment = {
    geometry: fragmentGeometry([], placements),
    nextOffset,
    height,
    advance: selection.advance,
    paint: (context) => resolvePaint({ fragment, context }),
    paintSteps: (context) => paintContainerSteps(box, height, hidden, context, path),
  };
  return fragment;
}
interface ResolvedContainerGeometry {
  readonly bodyHeight: number;
  readonly height: number;
}
function containerPlan(
  box: Sizing,
  children: readonly PreparedBlock[],
  keepTogether: boolean,
  freshHeight: number,
  path: string,
  blockRole = false,
  resolved?: ResolvedContainerGeometry,
) {
  const natural = sum([resolved?.bodyHeight ?? stackHeight(children, box.gap), box.vertical]);
  const authoredHeight = clamp(box.style.height ?? natural, box.style.minHeight, box.style.maxHeight);
  const height = resolved?.height ?? authoredHeight;
  // Metric fit does not undo an authored hidden clamp or turn stretch into clipping.
  const clipped = height < natural && (!resolved || (box.style.overflow === "hidden" && authoredHeight < natural));
  const overflows = resolved ? exceeds(natural, height) : clipped;
  const aligned = children.some((child) => child.autoMargin);
  const containsAutoAlignment = children.some((child) => child.autoMargin || child.containsAutoAlignment);
  const definiteAlignment = blockRole && box.style.height !== undefined && aligned;
  const contentAlignment = definiteAlignment
    ? { height: height - box.vertical, capacity: contentCapacity(box, height, path) }
    : undefined;
  if ((clipped || overflows) && (box.style.marginTop === "auto" || containsAutoAlignment))
    fail("VERTICAL_OVERFLOW", path, "Auto alignment cannot clip its child or explicit-height parent");
  if (overflows && box.style.overflow !== "hidden")
    fail("VERTICAL_OVERFLOW", path, "Natural children exceed the constrained border-box height");
  if (clipped && height <= (box.borders.borderTop?.width ?? 0) + (box.borders.borderBottom?.width ?? 0))
    fail("GEOMETRY", path, "Hidden content requires a positive padding-edge clip");
  if (height < box.vertical) fail("GEOMETRY", path, "Height cannot erase padding/border reservations");
  const blank = Math.max(0, height - natural);
  const content = stack(
    children,
    box.gap,
    definiteAlignment && aligned ? 0 : blank,
    contentCapacity(box, freshHeight, path),
    path,
  );
  const whole = keepTogether || box.style.height !== undefined || clipped || overflows;
  const hidden =
    box.style.overflow === "hidden" &&
    (box.style.height !== undefined || box.style.maxHeight !== undefined) &&
    height > 0;
  return { content, height, whole, hidden, contentAlignment, containsAutoAlignment };
}
export function containerProducer(
  box: Sizing,
  children: readonly PreparedBlock[],
  keepTogether: boolean,
  freshHeight: number,
  path: string,
  blockRole = false,
  resolved?: ResolvedContainerGeometry,
): PreparedBlock {
  const { content, height, whole, hidden, contentAlignment, containsAutoAlignment } = containerPlan(
    box,
    children,
    keepTogether,
    freshHeight,
    path,
    blockRole,
    resolved,
  );
  const prepared: PreparedBlock = {
    ...(contentAlignment ? { contentAlignment } : {}),
    ...(containsAutoAlignment ? { containsAutoAlignment } : {}),
    fragmentation: whole ? "atomic" : "splittable",
    naturalSize: { width: box.width, height },
    extent: whole ? 1 : content.extent,
    fragment: (request) => resolveFragment(prepared, request),
    fragmentSteps: (request) =>
      whole
        ? atomic(box, content, height, hidden, request, path, contentAlignment)
        : splittable(box, content, request, path),
  };
  if (children.length === 1) liftDirectVisualReference(children[0]!, prepared, containerChildOrigin(box));
  return prepared;
}
