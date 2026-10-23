import assert from "node:assert/strict";
import test from "node:test";
import { sum } from "../src/arithmetic.js";
import { add, half, hull, interval, max, metricSum2, sub } from "../src/inline-band-interval.js";

test("rounded interval operators preserve endpoints, subnormals and exact cancellation", () => {
  assert.deepEqual(add(interval(1e300), interval(-1e300), ""), interval(0));
  assert.deepEqual(half(interval(Number.MIN_VALUE, 3 * Number.MIN_VALUE), ""), interval(0, 2 * Number.MIN_VALUE));
  assert.deepEqual(sub(interval(-2, 4), interval(-3, 7), ""), interval(-9, 7));
  assert.deepEqual(hull(interval(-2), interval(7)), interval(-2, 7));
  assert.deepEqual(max(interval(-2, 4), interval(-3, 7)), interval(-2, 7));
  for (const invoke of [
    () => interval(2, 1),
    () => interval(NaN),
    () => interval(Infinity),
    () => add(interval(1e308), interval(1e308), ""),
    () => sub(interval(-1e308), interval(1e308), ""),
  ])
    assert.throws(invoke);
});

test("metricSum2 differentially encloses compensated sums in both magnitude branches", () => {
  const values = [
    0,
    Number.MIN_VALUE,
    3 * Number.MIN_VALUE,
    1e-300,
    -1e-300,
    0.1,
    -0.2,
    1,
    -1,
    1e16,
    -1e16,
    1e300,
    -1e300,
  ];
  for (const a of values)
    for (const b of values) {
      const point = metricSum2(interval(a), interval(b), "");
      assert.equal(point.lo, sum([a, b]));
      assert.equal(point.hi, sum([a, b]));
    }
  let seed = 78291;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 2000; i++) {
    const scale = 10 ** Math.floor(random() * 600 - 300);
    const endpoints = Array.from({ length: 4 }, () => (random() - 0.5) * scale).sort((a, b) => a - b);
    const a = interval(endpoints[0]!, endpoints[2]!);
    const b = interval(endpoints[1]!, endpoints[3]!);
    const bound = metricSum2(a, b, "");
    for (const x of [a.lo, a.hi, a.lo / 2 + a.hi / 2])
      for (const y of [b.lo, b.hi, b.lo / 2 + b.hi / 2]) {
        const actual = sum([x, y]);
        assert.ok(bound.lo <= actual && actual <= bound.hi);
      }
  }
});
