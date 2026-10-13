import { bits, dyadic } from "@updf/layout-boxes/numeric";
import { invalid } from "./reader.js";

const binaryScale = 1n << 1075n;

function signed(value: number): bigint {
  const magnitude = dyadic(bits(Math.abs(value)));
  return value < 0 ? -magnitude : magnitude;
}

function coordinates(a: number, b: number, c: number) {
  // Ordinary TrueType points and implied midpoints need only small integers.
  if (Number.isSafeInteger(a * 2) && Number.isSafeInteger(b * 2) && Number.isSafeInteger(c * 2))
    return { a: BigInt(a * 2), b: BigInt(b * 2), c: BigInt(c * 2), scale: 2n };
  return { a: signed(a), b: signed(b), c: signed(c), scale: binaryScale };
}

/** Exact floor/ceil of the interior extremum of these materialized binary64 coordinates. */
export function roundedExtremum(a: number, b: number, c: number): readonly [number, number] | undefined {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) invalid("Nonfinite outline coordinate");
  // Strict endpoint derivative signs establish an interior root without computing t.
  if ((b >= a && b <= c) || (b >= c && b <= a)) return undefined;
  const point = coordinates(a, b, c);
  let denominator = (point.a - 2n * point.b + point.c) * point.scale;
  let numerator = point.a * point.c - point.b * point.b;
  if (denominator < 0n) {
    denominator = -denominator;
    numerator = -numerator;
  }
  const quotient = numerator / denominator,
    remainder = numerator % denominator;
  const lower = quotient - (remainder < 0n ? 1n : 0n),
    upper = quotient + (remainder > 0n ? 1n : 0n);
  if (lower < -32768n || upper > 32767n) invalid("Outline extremum exceeds prepared font bounds");
  return [Number(lower), Number(upper)];
}
