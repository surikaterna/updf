import { fail, finite } from "@updf/core/internal";

export interface Interval {
  readonly lo: number;
  readonly hi: number;
}
/** Bounds rounded binary64 operations, not their real-arithmetic reassociations. */
export function interval(lo: number, hi = lo, path = ""): Interval {
  finite(lo, path);
  finite(hi, path);
  if (lo > hi) fail("GEOMETRY", path, "Inverted inline band interval");
  return { lo, hi };
}
export function hull(a: Interval, b: Interval): Interval {
  return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
}
export function add(a: Interval, b: Interval, path: string): Interval {
  return interval(a.lo + b.lo, a.hi + b.hi, path);
}
export function sub(a: Interval, b: Interval, path: string): Interval {
  return interval(a.lo - b.hi, a.hi - b.lo, path);
}
export function half(a: Interval, path: string): Interval {
  return interval(a.lo / 2, a.hi / 2, path);
}
export function max(a: Interval, b: Interval): Interval {
  return { lo: Math.max(a.lo, b.lo), hi: Math.max(a.hi, b.hi) };
}
function magnitude(a: Interval): Interval {
  return interval(
    a.lo <= 0 && a.hi >= 0 ? 0 : Math.min(Math.abs(a.lo), Math.abs(a.hi)),
    Math.max(Math.abs(a.lo), Math.abs(a.hi)),
  );
}
/** The existing MetricSum's two additions, including its initial zero correction. */
export function metricSum2(a: Interval, b: Interval, path: string): Interval {
  const zero = interval(0);
  const first = add(zero, a, path);
  // fl(0+a) is a and fl(a-a) is zero for finite a, including subnormals.
  const initial = zero;
  const s = add(first, b, path);
  const am = magnitude(first),
    bm = magnitude(b);
  const left = () => add(sub(first, s, path), b, path);
  const right = () => add(sub(b, s, path), first, path);
  const residual = am.lo >= bm.hi ? left() : am.hi < bm.lo ? right() : hull(left(), right());
  return add(s, add(initial, residual, path), path);
}
