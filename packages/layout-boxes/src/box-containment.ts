import { exceeds, sum } from "./arithmetic.js";
import type { BoxContainment } from "./box-types.js";
import { fail } from "./error.js";

/** Preserve the native association and compare both edges in the immediate parent frame. */
export function boxContained(
  containment: BoxContainment,
  inset: number,
  offset: number,
  extent: number,
  frame: number,
  trailing: number,
  path: string,
): boolean {
  const start = sum([inset, offset]);
  const end = start + extent;
  const upper = frame - trailing;
  if (![inset, offset, extent, frame, trailing, start, end, upper].every(Number.isFinite))
    fail("GEOMETRY", path, "Nonfinite box containment");
  if (containment === "native") return start >= inset && end <= upper;
  const lowerScale = Math.max(Math.abs(inset), Math.abs(offset), Math.abs(start));
  const upperScale = Math.max(lowerScale, Math.abs(extent), Math.abs(end), Math.abs(frame), Math.abs(trailing));
  return !exceeds(inset, start, lowerScale) && !exceeds(end, upper, upperScale);
}
