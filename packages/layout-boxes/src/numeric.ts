/**
 * Binary64 primitives for callers that have already validated their geometry.
 * bits: finite nonnegative number (negative zero is canonicalized to zero).
 * value: encoding in [0, 0x7fefffffffffffff].
 * dyadic/spacing/successor: encoding in that same nonnegative finite range.
 * dyadic units are half the smallest subnormal; spacing is the upward step in those units.
 * floorDyadic: nonnegative integer in those units; undefined for zero or above max finite.
 * successor: undefined at max finite; otherwise the next encoding (including zero -> MIN_VALUE).
 * These low-level operations do not validate preconditions and are not general number converters.
 */
export { bits, dyadic, floorDyadic, spacing, successor, value } from "./binary64.js";
