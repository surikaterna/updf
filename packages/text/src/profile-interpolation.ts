import { bits, successor, value } from "@updf/layout-boxes/numeric";
import type { EdgeProfilePoint } from "./composition-types.js";

function upward(n: number): number {
  if (!Number.isFinite(n)) return Infinity;
  const next = successor(bits(n));
  return next === undefined ? Infinity : value(next);
}
function downward(n: number): number {
  return n === 0 ? 0 : value(bits(n) - 1n);
}
/** Validated positive depths and strictly ordered nonnegative heights; query lies on the segment. */
export function profileDepth(a: EdgeProfilePoint, b: EdgeProfilePoint, y: number): number {
  if (y === a.y || a.x === b.x) return a.x;
  if (y === b.y) return b.x;
  const low = Math.min(a.x, b.x),
    high = Math.max(a.x, b.x);
  // Express either slope as low + delta * positive-distance / positive-span.
  // Each rounded operation is widened separately, including zero/subnormal results.
  const distance = upward(a.x < b.x ? y - a.y : b.y - y);
  const span = downward(b.y - a.y);
  if (span === 0) return high;
  const fraction = Math.min(1, upward(distance / span));
  const delta = upward(high - low);
  const product = upward(delta * fraction);
  const upper = upward(low + product);
  // A linear interpolation is in the exact authored endpoint range. Overflow or
  // poor conditioning therefore safely falls back to its maximum, never below it.
  return Math.min(high, upper);
}
