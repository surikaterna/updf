import assert from "node:assert/strict";
import test from "node:test";
import { outlineBounds } from "../src/bounds.js";
import { roundedExtremum } from "../src/extremum.js";
import { diagnostic } from "./helpers.js";
import { composite, outlineReader, words } from "./outline-helpers.js";

function oracle(a: bigint, b: bigint, c: bigint, scale: bigint): readonly [number, number] | undefined {
  let d = a - 2n * b + c,
    t = a - b;
  if (!d) return undefined;
  if (d < 0n) {
    d = -d;
    t = -t;
  }
  if (t <= 0n || t >= d) return undefined;
  // Evaluate Bernstein at the rational root rather than the production determinant identity.
  const n = (d - t) ** 2n * a + 2n * (d - t) * t * b + t ** 2n * c;
  const denominator = d ** 2n * scale,
    q = n / denominator,
    r = n % denominator;
  return [Number(q - (r < 0n ? 1n : 0n)), Number(q + (r > 0n ? 1n : 0n))];
}

test("integer boundaries are exact; real sub-ULP-at-one ink is never snapped away", () => {
  assert.deepEqual(roundedExtremum(0, 2, 0), [1, 1]);
  assert.deepEqual(roundedExtremum(0, 2 + 2 ** -51, 0), [1, 2]);
  assert.deepEqual(roundedExtremum(0, 2 - 2 ** -52, 0), [0, 1]);
  assert.deepEqual(roundedExtremum(0, -2 - 2 ** -51, 0), [-2, -1]);
  assert.deepEqual(roundedExtremum(0, -2 + 2 ** -52, 0), [-1, 0]);
  assert.deepEqual(roundedExtremum(0, Number.MIN_VALUE, 0), [0, 1]);
  assert.deepEqual(roundedExtremum(0, -Number.MIN_VALUE, 0), [-1, 0]);
});

test("constant/monotone axes and endpoint-only roots add no interior extremum", () => {
  for (const points of [
    [0, 0, 0],
    [1, 1, 2],
    [1, 2, 2],
    [3, 2, 1],
    [-1, 0, 1],
  ])
    assert.equal(roundedExtremum(points[0]!, points[1]!, points[2]!), undefined);
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => roundedExtremum(0, value, 0), diagnostic());
  assert.throws(() => roundedExtremum(0, 65536, 0), diagnostic());
  assert.deepEqual(roundedExtremum(0, -65536, 0), [-32768, -32768]);
});

test("seeded integer, half-integer and finer dyadics match an independent rational Bernstein oracle", () => {
  let seed = 0x207d;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed % 20001) - 10000;
  };
  for (const power of [0, 1, 14, 28, 50, 100, 1074]) {
    const scale = 1n << BigInt(power);
    for (let i = 0; i < 200; i++) {
      const ints = [next(), next(), next()] as const;
      const values = ints.map((n) => n * 2 ** -power);
      const expected = oracle(BigInt(ints[0]), BigInt(ints[1]), BigInt(ints[2]), scale);
      assert.deepEqual(roundedExtremum(values[0]!, values[1]!, values[2]!), expected);
      assert.deepEqual(roundedExtremum(values[2]!, values[1]!, values[0]!), expected);
    }
  }
});

test("decoded F2DOT14 composite coordinates retain fine fractional extrema", () => {
  const header = words([1, 0, 0, 0, 2, 2, 0]);
  const glyph = new Uint8Array([...header, 1, 0, 1, ...words([0, 1, -1, 0, 1, 1])]);
  const reader = outlineReader([glyph, composite(0, 3 | 64, [1, 16384])]);
  assert.deepEqual(outlineBounds(reader.get(1)), [0, 0, 1, 2]);
  const reversed = reader.get(1).map((contour) => [...contour].reverse());
  assert.deepEqual(outlineBounds(reversed), [0, 0, 1, 2]);
});
