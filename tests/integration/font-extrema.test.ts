import assert from "node:assert/strict";
import test from "node:test";
import { outlineBounds } from "../../packages/fontkite/src/bounds.js";
import { fixture } from "../../packages/fontkite/test/helpers.js";
import {
  cubicTrace,
  directQuadratic,
  pathFactory,
  probeFont,
  singleAxisPath,
} from "../../scripts/font-corpus/fontkit-probe.js";
import { extremaCases } from "./font-extrema-cases.js";

/** Test oracle for integer/half-integer coordinates only; no floating root/evaluation or tolerance. */
function exact(points: readonly number[]) {
  assert.ok(points.length === 3 && points.every((n) => Number.isSafeInteger(n * 2)));
  const [a, b, c] = points.map((n) => BigInt(n * 2)) as [bigint, bigint, bigint];
  const d = a - 2n * b + c;
  assert.notEqual(d, 0n);
  const sign = d < 0n ? -1n : 1n;
  const rootNumerator = (a - b) * sign,
    rootDenominator = d * sign;
  assert.ok(rootNumerator > 0n && rootNumerator < rootDenominator);
  const numerator = (a * c - b * b) * sign,
    denominator = 2n * d * sign;
  const quotient = numerator / denominator,
    remainder = numerator % denominator;
  const floor = quotient - (remainder < 0n ? 1n : 0n);
  const ceil = quotient + (remainder > 0n ? 1n : 0n);
  return { numerator, denominator, floor: Number(floor), ceil: Number(ceil) };
}
function kiteBound(points: readonly number[], upper: boolean): number {
  const contour = points.map((x, i) => ({ x, y: i, on: i !== 1 }));
  return outlineBounds([contour])[upper ? 2 : 0];
}

test("Fontkite satisfies all ten exact extrema witnesses; Fontkit differences remain explicit", async () => {
  const factory = pathFactory(probeFont(await fixture()));
  assert.equal(
    extremaCases.reduce((sum, row) => sum + row.count, 0),
    26,
  );
  for (const row of extremaCases) {
    const certificate = exact(row.points),
      correct = row.upper ? certificate.ceil : certificate.floor;
    assert.equal(certificate.numerator * BigInt(row.denominator), BigInt(row.numerator) * certificate.denominator);
    const path = singleAxisPath(factory, row.points);
    const observedKit = row.upper ? Math.ceil(path.bbox.maxX) : Math.floor(path.bbox.minX);
    const observedKite = kiteBound(row.points, row.upper);
    assert.equal(observedKit, row.kit, row.id);
    assert.equal(observedKite, correct, row.id);
    assert.equal(observedKit === correct, row.cause === "kite-rounding", row.id);
    const trace = cubicTrace(row.points[0], row.points[1], row.points[2]);
    assert.equal(trace.a !== 0, row.cause === "kit-root", row.id);
  }
});

test("Fontkite integer extrema are invariant under curve reversal despite floating evaluation roundoff", () => {
  const forward = [284.5, 292, 277],
    reverse = [...forward].reverse();
  assert.equal(exact(forward).ceil, 287);
  assert.equal(exact(reverse).ceil, 287);
  assert.equal(directQuadratic(284.5, 292, 277), 287.00000000000006);
  assert.equal(kiteBound(forward, true), 287);
  assert.equal(kiteBound(reverse, true), 287);
});

test("Fontkit degree elevation plus cancellation loses a genuine interior minimum", async () => {
  const factory = pathFactory(probeFont(await fixture()));
  const trace = cubicTrace(3, 0, 2);
  assert.equal(trace.a, -8.881784197001252e-16);
  assert.deepEqual(trace.roots, [1, 11258999068426240]);
  assert.equal(singleAxisPath(factory, [3, 0, 2]).bbox.minX, 2);
  const correct = exact([3, 0, 2]);
  assert.equal(correct.numerator * 5n, 6n * correct.denominator);
  assert.equal(correct.floor, 1);
});

test("Fontkit evaluation can overshoot an integer maximum even with an exact zero cubic coefficient", async () => {
  const factory = pathFactory(probeFont(await fixture()));
  assert.equal(cubicTrace(285.5, 293, 278).a, 0);
  assert.equal(singleAxisPath(factory, [285.5, 293, 278]).bbox.maxX, 288.00000000000006);
  assert.equal(exact([285.5, 293, 278]).ceil, 288);
});

test("independent bounds catch the Lato Bold U+20AF error shared by both old evaluators", async () => {
  const factory = pathFactory(probeFont(await fixture()));
  const points = [2432, 2447, 2417];
  assert.equal(exact(points).ceil, 2437);
  assert.equal(directQuadratic(2432, 2447, 2417), 2437.0000000000005);
  assert.equal(singleAxisPath(factory, points).bbox.maxX, 2437.0000000000005);
  assert.equal(kiteBound(points, true), 2437);
  assert.equal(kiteBound([...points].reverse(), true), 2437);
});
