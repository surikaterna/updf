import assert from "node:assert/strict";
import test from "node:test";
import { LayoutInputError } from "../src/index.js";
import {
  createFragmentOperation,
  createRangeOperation,
  type FragmentLimits,
  type FragmentProvider,
  type PreparedSource,
  type ProviderWork,
  type RangeOperation,
} from "../src/fragmentation.js";

type Factory = <D, C>(provider: FragmentProvider<D, C>, limits?: FragmentLimits) => RangeOperation<D, C>;
const factories: readonly [string, Factory][] = [
  ["range", createRangeOperation],
  ["full", createFragmentOperation],
];
const request = { offset: 0, width: 1, height: 2, usedHeight: 0 };
const source = (descriptor: object, extent = 3) => ({
  id: "source",
  path: "/source",
  descriptor,
  extent,
  mode: "splittable" as const,
  width: { mode: "fixed" as const, value: 1 },
});

test("range operation exposes only selection capabilities; full operation retains every capability", () => {
  const provider = { next: () => ({ end: 1, height: 1, content: null }) };
  const range = createRangeOperation(provider);
  const full = createFragmentOperation(provider);
  assert.deepEqual(Object.keys(range).sort(), ["close", "counts", "prepare", "select"]);
  assert.deepEqual(Object.keys(full).sort(), [
    "candidates",
    "close",
    "counts",
    "fragment",
    "materializeCandidate",
    "nextCandidate",
    "prepare",
    "select",
    "start",
  ]);
  assert.ok(Object.isFrozen(range));
  assert.ok(Object.isFrozen(full));
  range.close();
  full.close();
});

for (const [name, factory] of factories) {
  test(`${name}: selection, snapshots, content identity and exact cumulative quotas agree`, () => {
    const descriptor = {},
      content = {};
    let calls = 0;
    const op = factory({
      next: (value, query, work) => {
        assert.equal(value, descriptor);
        assert.ok(Object.isFrozen(query));
        calls++;
        work.consume(2);
        return { end: query.offset + 1, height: 1, content };
      },
    });
    const input = source(descriptor);
    const prepared = op.prepare(input);
    assert.equal(op.prepare(input), prepared);
    const selected = op.select(prepared, request)!;
    assert.deepEqual([selected.start, selected.end, selected.height], [0, 2, 2]);
    assert.equal(calls, 3);
    assert.ok(Object.isFrozen(selected) && Object.isFrozen(selected.units));
    assert.ok(selected.units.every((unit) => Object.isFrozen(unit) && unit.content === content));
    assert.equal(Object.isFrozen(content), false);
    assert.deepEqual(op.counts(), {
      attempts: 1,
      sourceVisits: 1,
      sourceReads: 2,
      measurements: 3,
      unitsExamined: 3,
      outputFragments: 2,
      providerUnits: 6,
    });
    const final = op.select(prepared, { ...request, offset: 2, height: 1 })!;
    assert.equal(final.end, 3);
    assert.equal(selected.units.length, 2);
    op.close();
    op.close();
    const counts = op.counts();
    assert.throws(() => op.select(prepared, request), LayoutInputError);
    assert.deepEqual(op.counts(), counts);
  });

  test(`${name}: measurement limits reject before callbacks and preserve charge ordering`, () => {
    let calls = 0;
    const op = factory(
      {
        next: () => {
          calls++;
          return { end: 1, height: 1, content: null };
        },
      },
      { measurements: 0 },
    );
    const prepared = op.prepare(source({}));
    assert.throws(() => op.select(prepared, request), { code: "LIMIT", path: "/work/measurements" });
    assert.equal(calls, 0);
    assert.deepEqual(op.counts(), {
      attempts: 1,
      sourceVisits: 1,
      sourceReads: 1,
      measurements: 0,
      unitsExamined: 1,
      outputFragments: 0,
      providerUnits: 0,
    });
    assert.throws(() => op.prepare(source({})), { code: "VALUE", path: "/operation" });
  });

  test(`${name}: exact width and foreign tokens reject before measurement`, () => {
    let calls = 0;
    const provider = {
      next: () => {
        calls++;
        return { end: 1, height: 1, content: null };
      },
    };
    const first = factory(provider),
      second = factory(provider);
    const prepared = first.prepare(source({}));
    assert.throws(() => second.select(prepared, request), { code: "VALUE", path: "/source" });
    assert.throws(() => first.select(prepared, { ...request, width: 1 + Number.EPSILON }), {
      code: "VALUE",
      path: "/source",
    });
    assert.equal(calls, 0);
  });

  test(`${name}: caught reentry still poisons; callback-close preserves escaping exception identity`, () => {
    let op: RangeOperation<object, null>, prepared: PreparedSource;
    op = factory({
      next: () => {
        assert.throws(() => op.select(prepared, request), /Reentrant/);
        return { end: 1, height: 1, content: null };
      },
    });
    prepared = op.prepare(source({}));
    assert.throws(() => op.select(prepared, request), /closed/);
    assert.equal(op.counts().outputFragments, 0);
    const sentinel = {};
    const closing = factory({
      next: () => {
        closing.close();
        throw sentinel;
      },
    });
    const other = closing.prepare(source({}));
    assert.throws(
      () => closing.select(other, request),
      (error) => error === sentinel,
    );
    assert.throws(() => closing.select(other, request), /closed/);
  });

  test(`${name}: expired work poisons the owner; empty sources still return an immutable empty range`, () => {
    let lease: ProviderWork | undefined;
    const op = factory({
      next: (_, { offset }, work) => {
        lease = work;
        return { end: offset + 1, height: 0, content: null };
      },
    });
    const prepared = op.prepare(source({}, 1));
    assert.equal(op.select(prepared, request)?.end, 1);
    assert.throws(() => lease!.consume(0), /expired/);
    assert.throws(() => op.select(prepared, request), /closed/);
    const empty = factory({
      next: () => {
        throw new Error("must not run");
      },
    });
    const result = empty.select(empty.prepare(source({}, 0)), { ...request, height: 0 })!;
    assert.deepEqual(result, { start: 0, end: 0, height: 0, units: [] });
    assert.ok(Object.isFrozen(result) && Object.isFrozen(result.units));
    empty.close();
  });
}
