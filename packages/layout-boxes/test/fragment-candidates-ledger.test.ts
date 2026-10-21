import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "../src/error.js";
import {
  type CandidateEndpoint,
  createFragmentOperation,
  type FragmentLimits,
  type ProviderWork,
} from "../src/fragmentation.js";

const source = () => ({
  id: "a",
  path: "/a",
  descriptor: {},
  extent: 3,
  mode: "splittable" as const,
  width: { mode: "fixed" as const, value: 10 },
});
const query = { offset: 0, width: 10 };
const code = (expected: string) => (e: unknown) => e instanceof LayoutInputError && e.code === expected;

for (const [category, calls, examined, measured, output, providerUnits] of [
  ["attempts", 0, 0, 0, 0, 0],
  ["unitsExamined", 0, 0, 0, 0, 0],
  ["measurements", 0, 1, 0, 0, 0],
  ["providerUnits", 1, 1, 1, 0, 0],
  ["outputFragments", 1, 1, 1, 0, 2],
] as const) {
  test(`candidate ${category} exhaustion preserves prior charges and stops publication`, () => {
    let actualCalls = 0;
    const limits: FragmentLimits = { [category]: category === "attempts" ? 1 : 0 };
    const op = createFragmentOperation(
      {
        next: (_, { offset }, work) => {
          actualCalls++;
          work.consume(2);
          return { end: offset + 1, height: 0, content: null };
        },
      },
      limits,
    );
    const cursor = op.candidates(op.prepare(source()), query);
    assert.throws(() => op.nextCandidate(cursor), code("LIMIT"));
    assert.equal(actualCalls, calls);
    assert.deepEqual(op.counts(), {
      attempts: category === "attempts" ? 1 : 2,
      sourceVisits: 1,
      sourceReads: 1,
      unitsExamined: examined,
      measurements: measured,
      outputFragments: output,
      providerUnits,
    });
    assert.throws(() => op.nextCandidate(cursor), code("VALUE"));
  });
}

test("candidate source visit exhaustion precedes source/request validation", () => {
  const op = createFragmentOperation(
    {
      next: () => {
        throw new Error("unexpected");
      },
    },
    { sourceVisits: 0 },
  );
  assert.throws(() => op.candidates({} as never, null as never), code("LIMIT"));
  assert.equal(op.counts().attempts, 1);
  assert.equal(op.counts().sourceVisits, 0);
});

test("output exhaustion precedes accepted record freeze and materialization array copy", () => {
  const freeze = Object.freeze;
  const slice = Array.prototype.slice;
  let accepted = 0;
  let copies = 0;
  Object.freeze = ((value: object) => {
    if (Object.hasOwn(value, "start") && Object.hasOwn(value, "content")) accepted++;
    return freeze(value);
  }) as typeof Object.freeze;
  Array.prototype.slice = function (...args) {
    copies++;
    return slice.apply(this, args);
  };
  try {
    const op = createFragmentOperation({ next: () => ({ end: 3, height: 0, content: null }) }, { outputFragments: 1 });
    const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
    if (first.done) throw new Error("expected candidate");
    assert.equal(accepted, 1);
    copies = 0;
    assert.throws(() => op.materializeCandidate(first.endpoint), code("LIMIT"));
    assert.equal(copies, 0);
    assert.equal(op.counts().outputFragments, 1);
    const zero = createFragmentOperation(
      { next: () => ({ end: 3, height: 0, content: null }) },
      { outputFragments: 0 },
    );
    assert.throws(() => zero.nextCandidate(zero.candidates(zero.prepare(source()), query)), code("LIMIT"));
    assert.equal(accepted, 1);
  } finally {
    Object.freeze = freeze;
    Array.prototype.slice = slice;
  }
});

test("materialization reserves the entire prefix atomically; no partial output charge", () => {
  const op = createFragmentOperation(
    { next: (_, { offset }) => ({ end: offset + 1, height: 0, content: null }) },
    { outputFragments: 3 },
  );
  const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
  if (first.done) throw new Error("expected candidate");
  const second = op.nextCandidate(first.cursor);
  if (second.done) throw new Error("expected candidate");
  assert.throws(() => op.materializeCandidate(second.endpoint), code("LIMIT"));
  assert.equal(op.counts().outputFragments, 2);
  assert.equal(op.counts().attempts, 4);
});

test("provider throw identity survives callback close; callback barrier rejects caught reentry or work errors", () => {
  const error = {};
  const throwing = createFragmentOperation({
    next: () => {
      throwing.close();
      throw error;
    },
  });
  const cursor = throwing.candidates(throwing.prepare(source()), query);
  assert.throws(
    () => throwing.nextCandidate(cursor),
    (e) => e === error,
  );
  for (const action of ["close", "reentry", "quota", "malformed-reentry"] as const) {
    const op = createFragmentOperation(
      {
        next: (_, { offset }, work) => {
          if (action === "close") op.close();
          if (action === "quota") assert.throws(() => work.consume(1), code("LIMIT"));
          if (action === "reentry") assert.throws(() => op.nextCandidate(start), code("VALUE"));
          if (action === "malformed-reentry")
            assert.throws(() => op.materializeCandidate({} as CandidateEndpoint), code("VALUE"));
          assert.throws(() => work.consume(0), code("VALUE"));
          return { end: offset + 1, height: 0, content: null };
        },
      },
      { providerUnits: 0 },
    );
    const start = op.candidates(op.prepare(source()), query);
    assert.throws(() => op.nextCandidate(start), code("VALUE"));
    assert.equal(op.counts().attempts, 2);
    assert.equal(op.counts().measurements, 1);
    assert.equal(op.counts().outputFragments, 0);
  }
});

test("retained candidate work lease expires and poisons before any further charge or endpoint materialization", () => {
  let retained: ProviderWork | undefined;
  const op = createFragmentOperation({
    next: (_, { offset }, work) => {
      retained = work;
      work.consume(2);
      return { end: offset + 1, height: 0, content: null };
    },
  });
  const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
  if (first.done) throw new Error("expected candidate");
  const counts = op.counts();
  assert.throws(() => retained!.consume(0), code("VALUE"));
  assert.throws(() => op.nextCandidate(first.cursor), code("VALUE"));
  assert.throws(() => op.materializeCandidate(first.endpoint), code("VALUE"));
  assert.deepEqual(op.counts(), counts);
});

test("terminal cursor is consumed and its replay charges an attempt but no provider work", () => {
  const op = createFragmentOperation({ next: () => ({ end: 3, height: 0, content: null }) });
  const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
  if (first.done) throw new Error("expected candidate");
  assert.deepEqual(op.nextCandidate(first.cursor), { done: true });
  assert.throws(() => op.nextCandidate(first.cursor), code("VALUE"));
  assert.equal(op.counts().attempts, 4);
  assert.equal(op.counts().measurements, 1);
  assert.equal(op.counts().outputFragments, 1);
});
