import assert from "node:assert/strict";
import test from "node:test";
import { MetricSum, sum } from "@updf/layout-boxes/arithmetic";

test("metric fork snapshots hidden compensation independently rather than collapsing value", () => {
  const source = new MetricSum();
  source.add(0.1);
  source.add(0.2);
  const fork = source.fork();
  assert.notEqual(fork, source);
  assert.equal(fork.value, source.value);
  assert.equal(fork.add(0.3), 0.6);
  assert.equal(sum([source.value, 0.3]), 0.6000000000000001);
  assert.equal(source.value, 0.30000000000000004);
  source.add(0.4);
  assert.equal(fork.value, 0.6);
});

test("metric fork retains cancellation, zero and nonfinite propagation", () => {
  const source = new MetricSum();
  assert.equal(source.fork().value, 0);
  source.add(1e16);
  source.add(1);
  const fork = source.fork();
  assert.equal(fork.add(-1e16), 1);
  assert.equal(source.value, 1e16);
  for (const value of [Infinity, -Infinity, NaN]) {
    const nonfinite = new MetricSum();
    nonfinite.add(value);
    const copy = nonfinite.fork();
    assert.ok(Object.is(copy.value, value));
    assert.ok(Object.is(copy.add(0), value));
    assert.ok(Object.is(nonfinite.value, value));
  }
});
