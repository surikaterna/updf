import { sum } from "./arithmetic.js";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "./binary64.js";
import { fail } from "./error.js";

export interface DerivedAxis {
  readonly start: number;
  readonly end: number;
  readonly nominalExtent: number;
  readonly capacity: number;
}
function illConditioned(path: string): never {
  fail(
    "GEOMETRY",
    path,
    "Derived region is numerically ill-conditioned: coordinate rounding exceeds the local precision budget.",
  );
}
export function derivedAxis(start: number, end: number, path: string): DerivedAxis {
  const nominalExtent = end - start;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    !Number.isFinite(nominalExtent) ||
    nominalExtent <= 0
  )
    fail("GEOMETRY", path, "Derived region must have finite ordered coordinates and positive extent.");
  const endBits = bits(end);
  const next = successor(endBits);
  if (next === undefined) illConditioned(path);
  const boundary = dyadic(endBits);
  const upper = dyadic(next);
  const nominal = bits(nominalExtent);
  const budget = 32n * spacing(nominal);
  if ((upper - boundary) / 2n > budget) illConditioned(path);
  const limit = (boundary + upper) / 2n - dyadic(bits(start));
  let capacityBits = floorDyadic(limit);
  if (capacityBits === undefined) illConditioned(path);
  // At an exact midpoint the endpoint's significand parity owns the rounding cell.
  if ((endBits & 1n) !== 0n && dyadic(capacityBits) === limit) capacityBits--;
  const difference = dyadic(capacityBits) - dyadic(nominal);
  if ((difference < 0n ? -difference : difference) > budget) illConditioned(path);
  const capacity = value(capacityBits);
  if (capacity <= 0 || start + capacity > end) illConditioned(path);
  return Object.freeze({ start, end, nominalExtent, capacity });
}
export function materializedStart(axis: DerivedAxis, offset: number, extent: number, path: string): number {
  const start = axis.start + offset;
  const end = start + extent;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < axis.start || end > axis.end)
    fail("GEOMETRY", path, "Materialized geometry exceeds its derived region under native coordinate association.");
  return start;
}
export function alignedTop(
  insetTop: number,
  insetBottom: number,
  vertical: number,
  height: number,
  extent: number,
  align: "start" | "center" | "end" | "stretch",
  path: string,
): number {
  if (align !== "end" && align !== "center") return 0;
  const end = height - insetBottom;
  const nominal = Math.max(0, sum([height, -vertical, -extent]));
  const offset = align === "end" ? nominal : nominal / 2;
  if (sum([insetTop, offset]) + extent <= end) return offset;
  if (insetTop + extent >= end) return 0;
  // Invert both native additions: (inset + offset) + extent must fit the content endpoint.
  const lastStart = derivedAxis(extent, end, path).capacity;
  if (lastStart <= insetTop) return 0;
  const free = Math.min(nominal, derivedAxis(insetTop, lastStart, path).capacity);
  return align === "end" ? free : free / 2;
}
