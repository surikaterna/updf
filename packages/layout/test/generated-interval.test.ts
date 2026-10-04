import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { bits, value } from "../src/binary64.js";
import {
  certifyGeneratedFragment,
  generatedFragmentStart,
  generatedIntervals,
  materializeGeneratedInterval,
} from "../src/generated-interval.js";

const path = "/generated";
const reservation = (sourceEnd: number) => ({ sourceStart: 0, sourceEnd });

test("fragment certificates reject foreign parts, forged records and dishonest extents without a ULP allowance", () => {
  const sequence = generatedIntervals();
  const first = sequence.append(12.6, path);
  const second = sequence.append(12.6, path);
  const fragment = certifyGeneratedFragment({ height: 25.2 }, [first, second]);
  assert.equal(generatedFragmentStart(fragment, second, 6, 12.6, 12.6, path), 18.6);
  const foreign = generatedIntervals().append(12.6, path);
  for (const certificate of [foreign, { ...second }])
    assert.throws(() => generatedFragmentStart(fragment, certificate, 6, 12.6, 12.6, path), DocumentError);
  assert.throws(() => generatedFragmentStart({ height: 25.2 }, second, 6, 12.6, 12.6, path), DocumentError);
  assert.throws(() => generatedFragmentStart(fragment, second, 6, 12.6, value(bits(12.6) + 1n), path), DocumentError);
  const dishonest = certifyGeneratedFragment({ height: value(bits(25.2) - 1n) }, [first, second]);
  assert.throws(() => generatedFragmentStart(dishonest, second, 6, 12.6, 12.6, path), DocumentError);
});

test("ordinary native fitting extents are preserved exactly", () => {
  const sequence = generatedIntervals();
  sequence.append(3, path);
  const interval = sequence.append(4, path);
  assert.deepEqual(interval, { sourceStart: 3, sourceEnd: 7, semanticExtent: 4 });
  assert.deepEqual(materializeGeneratedInterval(interval, 2, reservation(7), path), {
    start: 5,
    sharedEnd: 9,
    semanticExtent: 4,
    allocationExtent: 4,
  });
  assert.ok(Object.isFrozen(interval));
});
test("fractional reproduction changes only the certified allocation extent", () => {
  const sequence = generatedIntervals();
  sequence.append(12.6, path);
  const interval = sequence.append(12.6, path);
  const allocation = materializeGeneratedInterval(interval, 6, reservation(25.2), path);
  assert.equal(allocation.start, 18.6);
  assert.equal(allocation.sharedEnd, 31.2);
  assert.equal(allocation.semanticExtent, 12.6);
  assert.equal(allocation.allocationExtent, 12.599999999999998);
  assert.equal(allocation.start + allocation.allocationExtent, 31.2);
  assert.ok(allocation.start + allocation.semanticExtent > allocation.sharedEnd);
  assert.ok(Object.isFrozen(allocation));
});
test("source overflow of one ULP cannot borrow a translated rounding cell", () => {
  const interval = generatedIntervals().append(value(bits(1) + 1n), path);
  for (const origin of [0, 6, 2 ** 54]) {
    assert.throws(
      () => materializeGeneratedInterval(interval, origin, reservation(1), path),
      (error: unknown) =>
        error instanceof DocumentError && error.diagnostics[0]?.message.includes("strict source reservation") === true,
    );
  }
});
test("source threshold midpoint is admitted but the next semantic coordinate overflows", () => {
  for (const increment of [32n, 33n]) {
    const sequence = generatedIntervals();
    sequence.append(1 - 1 / 64, path);
    const extent = value(bits(1 / 64) + increment);
    const interval = sequence.append(extent, path);
    if (increment === 32n) {
      assert.equal(interval.sourceEnd, 1);
      assert.equal(materializeGeneratedInterval(interval, 0, reservation(1), path).allocationExtent, extent);
    } else {
      assert.equal(interval.sourceEnd, value(bits(1) + 1n));
      assert.throws(() => materializeGeneratedInterval(interval, 0, reservation(1), path), DocumentError);
    }
  }
});
test("subnormal endpoints retain exact native geometry", () => {
  const sequence = generatedIntervals();
  sequence.append(Number.MIN_VALUE, path);
  const interval = sequence.append(Number.MIN_VALUE, path);
  const allocation = materializeGeneratedInterval(interval, 0, reservation(2 * Number.MIN_VALUE), path);
  assert.equal(allocation.allocationExtent, Number.MIN_VALUE);
  assert.equal(allocation.start + allocation.allocationExtent, allocation.sharedEnd);
});
test("invalid metrics, coordinates, reservations and forged records are rejected", () => {
  for (const extent of [-1, 0, NaN, Infinity])
    assert.throws(() => generatedIntervals().append(extent, path), DocumentError);
  const interval = generatedIntervals().append(1, path);
  for (const origin of [-1, NaN, Infinity])
    assert.throws(() => materializeGeneratedInterval(interval, origin, reservation(1), path), DocumentError);
  for (const bounds of [
    reservation(NaN),
    reservation(Infinity),
    reservation(0),
    { sourceStart: -1, sourceEnd: 1 },
    { sourceStart: 0.5, sourceEnd: 1 },
  ])
    assert.throws(() => materializeGeneratedInterval(interval, 0, bounds, path), DocumentError);
  assert.throws(() => materializeGeneratedInterval({ ...interval }, 0, reservation(1), path), DocumentError);
});
test("collapsed, nonfinite and ill-conditioned translated intervals are rejected", () => {
  const interval = generatedIntervals().append(1, path);
  for (const origin of [2 ** 54, Number.MAX_VALUE])
    assert.throws(() => materializeGeneratedInterval(interval, origin, reservation(1), path), DocumentError);
  const sequence = generatedIntervals();
  sequence.append(0.2, path);
  const tiny = sequence.append(0.001, path);
  assert.throws(() => materializeGeneratedInterval(tiny, 6, reservation(tiny.sourceEnd), path), DocumentError);
  const overflowing = generatedIntervals();
  overflowing.append(Number.MAX_VALUE, path);
  assert.throws(() => overflowing.append(Number.MAX_VALUE, path), DocumentError);
});
