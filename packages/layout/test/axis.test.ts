import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { derivedAxis } from "../dist/axis.js";
import { bits, dyadic, spacing, value } from "../dist/binary64.js";

test("inverse-translation capacities own the exact endpoint midpoint with ties-to-even parity", () => {
  for (const parity of [0n, 1n]) {
    const end = value(bits(1) + parity);
    const axis = derivedAxis(end - 1 / 32, end, "/pageTemplate/width");
    assert.equal(bits(axis.capacity) - bits(axis.nominalExtent), parity === 0n ? 16n : 15n);
    assert.ok(axis.start + axis.capacity <= end);
    assert.ok(axis.start + value(bits(axis.capacity) + 1n) > end);
    const midpoint = (dyadic(bits(end)) + dyadic(bits(end) + 1n)) / 2n - dyadic(bits(axis.start));
    assert.equal(dyadic(bits(axis.capacity)) === midpoint, parity === 0n);
  }
});
test("32 local ULP conditioning admits exactly the threshold and rejects its next coordinate", () => {
  const start = 1 - 1 / 64;
  const axis = derivedAxis(start, 1, "/pageTemplate/height");
  assert.equal(dyadic(bits(axis.capacity)) - dyadic(bits(axis.nominalExtent)), 32n * spacing(bits(axis.nominalExtent)));
  assert.equal(bits(axis.capacity) - bits(axis.nominalExtent), 32n);
  assert.throws(
    () => derivedAxis(value(bits(start) + 1n), 1, "/pageTemplate/height"),
    (error: unknown) =>
      error instanceof DocumentError && error.diagnostics[0]?.message.includes("numerically ill-conditioned") === true,
  );
});
test("dyadic certificates handle subnormals without underflow and reject unavailable finite cells", () => {
  const axis = derivedAxis(-0, Number.MIN_VALUE, "/pageTemplate/width");
  assert.equal(axis.capacity, Number.MIN_VALUE);
  assert.equal(derivedAxis(Number.MIN_VALUE, 2 * Number.MIN_VALUE, "").capacity, Number.MIN_VALUE);
  for (const [start, end] of [
    [0, Number.MAX_VALUE],
    [1, 1],
    [2, 1],
    [0, Infinity],
  ]) {
    assert.throws(() => derivedAxis(start!, end!, "/pageTemplate/width"), DocumentError);
  }
});
test("capacity is the maximal native fitting binary64 across bounded exponent/binade samples", () => {
  let accepted = 0;
  for (const exponent of [-1074, -1022, -100, -1, 0, 16, 500, 1023]) {
    for (const significand of [1, 1.125, 1.5, 1.875]) {
      const end = 2 ** exponent * significand;
      accepted += checkRatios(end);
    }
  }
  assert.ok(accepted >= 160);
});
function checkRatios(end: number): number {
  let accepted = 0;
  for (const ratio of [0, 0.25, 0.5, 0.75, 0.96875, 0.984375]) {
    const start = end * ratio;
    if (start >= end) continue;
    checkMaximal(start, end);
    accepted++;
  }
  return accepted;
}
function checkMaximal(start: number, end: number): void {
  const axis = derivedAxis(start, end, "/pageTemplate/width");
  assert.ok(start + axis.capacity <= end);
  assert.ok(start + value(bits(axis.capacity) + 1n) > end);
}
