import { checkLimit, exceeds, fail, MetricSum, sum } from "@updf/core/internal";
import { bits, dyadic, floorDyadic, value } from "./binary64.js";
import { offsetReservation, reserveAncestors } from "./container-reservation.js";
import type { FragmentCall, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";

export interface StackEntry {
  readonly start: number;
  readonly end: number;
  readonly block?: PreparedBlock;
  readonly space?: { readonly height: number; readonly capacity: number };
}
export interface Stack {
  readonly entries: readonly StackEntry[];
  readonly extent: number;
  readonly height: number;
}
export interface StackPiece {
  readonly left?: number;
  readonly fragment: PlacedFragment;
  readonly top: number;
}
export interface StackSelection {
  readonly pieces: readonly StackPiece[];
  readonly nextOffset: number;
  readonly height: number;
  readonly advance: boolean;
}

export function stack(
  children: readonly PreparedBlock[],
  gap: number,
  blank: number,
  capacity: number,
  path: string,
): Stack {
  const entries: StackEntry[] = [];
  const height = new MetricSum();
  let extent = 0,
    boxes = 0;
  const append = (block: PreparedBlock | undefined, space?: StackEntry["space"]): void => {
    // Binary64 has at most 2098 significant dyadic bits: 40 terms suffice for an exact remainder.
    const count =
      block?.extent ?? (space?.height ? Math.ceil(space.height / Math.max(space.capacity, Number.MIN_VALUE)) + 42 : 1);
    const end = checkLimit(extent + count, Number.MAX_SAFE_INTEGER, path, "Block extent");
    entries.push({ start: extent, end, ...(block ? { block } : {}), ...(space ? { space } : {}) });
    extent = end;
  };
  for (const child of children) {
    if (!child.control && boxes++ > 0 && gap) {
      append(undefined, { height: gap, capacity: capacity > 0 ? capacity : gap });
      height.add(gap);
    }
    append(child);
    height.add(child.naturalSize.height);
  }
  if (blank > 0 || !extent) {
    append(undefined, { height: blank, capacity: capacity > 0 ? capacity : Math.max(blank, 1) });
    height.add(blank);
  }
  return { entries, extent, height: height.value };
}
function locate(entries: readonly StackEntry[], offset: number): StackEntry {
  let low = 0,
    high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((entries[mid]?.end ?? 0) <= offset) low = mid + 1;
    else high = mid;
  }
  const entry = entries[low];
  if (!entry) fail("TYPE", "", "Missing stack extent");
  return entry;
}
function space(entry: StackEntry, request: FragmentRequest): PlacedFragment | undefined {
  const sizing = entry.space;
  if (!sizing) return undefined;
  const left = request.state?.get(entry, request.offset) ?? dyadic(bits(sizing.height));
  if (request.availableHeight <= 0 && left > 0n) return undefined;
  const available = dyadic(bits(Math.max(0, request.availableHeight)));
  const amount = left < available ? left : available;
  const encoded = floorDyadic(amount);
  const height = encoded === undefined ? 0 : value(encoded);
  if (left > 0n && height === 0) return undefined;
  if (exceeds(sum([request.usedHeight, height]), request.freshHeight)) return undefined;
  const remaining = left - dyadic(bits(height));
  const nextOffset = remaining === 0n ? entry.end - entry.start : request.offset + 1;
  if (remaining > 0n && nextOffset >= entry.end - entry.start)
    fail("GEOMETRY", "", "Space continuation exhausted its finite representation extent");
  request.state?.set(entry, nextOffset, remaining);
  reserveAncestors(request.reserve, request.budget, request.state, height);
  return { height, nextOffset, paint: () => [] };
}
export function* selectStackSteps(
  stack: Stack,
  request: FragmentRequest,
): Generator<FragmentCall, StackSelection | undefined, PlacedFragment | undefined> {
  const pieces: StackPiece[] = [];
  const height = new MetricSum();
  let offset = request.offset,
    advance = false;
  while (offset < stack.extent) {
    const entry = locate(stack.entries, offset);
    const prefix = height.value;
    const local = {
      ...request,
      offset: offset - entry.start,
      usedHeight: sum([request.usedHeight, height.value]),
      availableHeight: request.availableHeight - height.value,
      atFreshRegion: request.atFreshRegion && height.value === 0,
      ...(request.budget ? { budget: request.budget.fork() } : {}),
      ...(request.state ? { state: request.state.fork() } : {}),
      ...(request.reserve ? { reserve: offsetReservation(request.reserve, prefix) } : {}),
    };
    const fragment = entry.block?.control
      ? { nextOffset: 1, height: 0, advance: true, paint: () => [] }
      : entry.block
        ? yield { block: entry.block, request: local }
        : space(entry, local);
    if (!fragment) break;
    if (local.budget) request.budget?.adopt(local.budget);
    if (local.state) request.state?.adopt(local.state);
    if (
      !Number.isSafeInteger(fragment.nextOffset) ||
      fragment.nextOffset <= local.offset ||
      fragment.nextOffset > entry.end - entry.start
    )
      fail("TYPE", "", "Child fragment must advance within its extent");
    pieces.push({ fragment, top: height.value });
    height.add(fragment.height);
    offset = entry.start + fragment.nextOffset;
    if (fragment.advance) {
      advance = true;
      break;
    }
  }
  return offset === request.offset ? undefined : { pieces, nextOffset: offset, height: height.value, advance };
}
