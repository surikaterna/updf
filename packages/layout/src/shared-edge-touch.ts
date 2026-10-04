import type { LocalEdgeClaim } from "./shared-edge-types.js";

type Interval = readonly [number, number];
export const edgeKey = (axis: LocalEdgeClaim["axis"], coordinate: number): string => `${axis}:${coordinate}`;

export function sharedIntervals(claims: readonly LocalEdgeClaim[]): readonly Interval[] {
  const events = new Map<number, [number, number]>();
  for (const claim of claims) {
    const side = claim.ownerSide === "top" || claim.ownerSide === "left" ? 0 : 1;
    for (const [point, delta] of [
      [claim.interval[0], 1],
      [claim.interval[1], -1],
    ] as const) {
      const event = events.get(point) ?? [0, 0];
      event[side] += delta;
      events.set(point, event);
    }
  }
  const result: [number, number][] = [];
  const counts: [number, number] = [0, 0];
  let previous: number | undefined;
  for (const [point, event] of [...events].sort(([a], [b]) => a - b)) {
    if (previous !== undefined && previous < point && counts[0] > 0 && counts[1] > 0) {
      const last = result.at(-1);
      if (last?.[1] === previous) last[1] = point;
      else result.push([previous, point]);
    }
    counts[0] += event[0];
    counts[1] += event[1];
    previous = point;
  }
  return result;
}

export function touches(intervals: readonly Interval[] | undefined, point: number, endpoint = false): boolean {
  if (!intervals) return false;
  let low = 0,
    high = intervals.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const interval = intervals[middle];
    if (interval && interval[0] <= point) low = middle + 1;
    else high = middle;
  }
  const interval = intervals[low - 1];
  return !!interval && (endpoint ? point <= interval[1] : point < interval[1]);
}
