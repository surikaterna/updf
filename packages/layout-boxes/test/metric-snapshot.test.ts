import assert from "node:assert/strict";
import test from "node:test";
import { MetricSum } from "../src/arithmetic.js";
import { derivedAxis, fitsMaterialized, materializedStart } from "../src/geometry.js";

test("metric snapshots preserve hidden compensation and previews do not mutate committed occupancy", () => {
  const metric = new MetricSum();
  metric.add(1e16);
  metric.add(1);
  const copy = metric.fork();
  assert.equal(metric.preview(-1e16), 1);
  assert.equal(metric.value, 1e16);
  assert.equal(copy.add(-1e16), 1);
  assert.equal(metric.value, 1e16);
  assert.equal(metric.preview(Infinity), Infinity);
  assert.ok(Number.isNaN(metric.preview(NaN)));
  assert.equal(metric.add(-1e16), 1);
});

test("native fit predicate and throwing certificate agree without accepting metric-only overrun", () => {
  for (const [end, offset, height, fits] of [
    [5, 4.9, 0.1, true],
    [0.3, 0.1, 0.2, false],
    [30.9, 20.6, 10.3, false],
    [Number.MIN_VALUE, 0, Number.MIN_VALUE, true],
    [Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, false],
  ] as const) {
    const axis = derivedAxis(0, end, "/axis");
    assert.equal(fitsMaterialized(axis, offset, height), fits);
    if (fits) assert.equal(materializedStart(axis, offset, height, "/axis"), offset);
    else assert.throws(() => materializedStart(axis, offset, height, "/axis"));
  }
  for (const value of [-1, NaN, Infinity]) {
    assert.equal(fitsMaterialized({ start: 0, end: 5 }, value, 1), false);
    assert.equal(fitsMaterialized({ start: 0, end: 5 }, 0, value), false);
  }
  assert.equal(fitsMaterialized({ start: 0, end: Infinity }, 0, 1), false);
  assert.equal(fitsMaterialized({ start: 2, end: 1 }, 0, 0), false);
});
