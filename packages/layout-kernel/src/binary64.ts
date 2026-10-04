const fractionMask = (1n << 52n) - 1n;
const maxFiniteBits = 0x7fefffffffffffffn;

export function bits(value: number): bigint {
  if (value === 0) return 0n;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return view.getBigUint64(0);
}
export function value(encoded: bigint): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, encoded);
  return view.getFloat64(0);
}
/** Exact nonnegative dyadics in units of half the smallest binary64 subnormal. */
export function dyadic(encoded: bigint): bigint {
  const exponent = encoded >> 52n;
  const fraction = encoded & fractionMask;
  return exponent === 0n ? fraction << 1n : ((1n << 52n) | fraction) << exponent;
}
export function spacing(encoded: bigint): bigint {
  const exponent = encoded >> 52n;
  return exponent === 0n ? 2n : 1n << exponent;
}
function bitLength(integer: bigint): number {
  let length = 1;
  let remaining = integer;
  for (const shift of [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1]) {
    const upper = remaining >> BigInt(shift);
    if (upper === 0n) continue;
    remaining = upper;
    length += shift;
  }
  return length;
}
export function floorDyadic(integer: bigint): bigint | undefined {
  if (integer <= 0n || integer > dyadic(maxFiniteBits)) return undefined;
  const shift = Math.max(1, bitLength(integer) - 53);
  const significand = integer >> BigInt(shift);
  return significand < 1n << 52n ? significand : (BigInt(shift) << 52n) | (significand & fractionMask);
}
export function successor(encoded: bigint): bigint | undefined {
  return encoded >= maxFiniteBits ? undefined : encoded + 1n;
}
