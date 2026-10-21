import assert from "node:assert/strict";
import { test } from "node:test";
import { sum } from "../src/arithmetic.js";
import { LayoutInputError } from "../src/error.js";
import { type CandidateEndpoint, createFragmentOperation, type FragmentSource } from "../src/fragmentation.js";

const source = (extent = 3): FragmentSource<object> => ({
  id: "a",
  path: "/a",
  descriptor: {},
  extent,
  mode: "splittable",
  width: { mode: "fixed", value: 10 },
});
const query = { offset: 0, width: 10 };

test("prefix metadata stays immutable; materialization borrows content and charges every fresh copy", () => {
  const content = {};
  const op = createFragmentOperation({
    next: (_, { offset }, work) => {
      work.consume(2);
      return { end: offset + 1, height: 1, content };
    },
  });
  let cursor = op.candidates(op.prepare(source()), query);
  const endpoints: CandidateEndpoint[] = [];
  for (let i = 0; i < 3; i++) {
    const result = op.nextCandidate(cursor);
    assert.equal(result.done, false);
    if (result.done) throw new Error("expected candidate");
    endpoints.push(result.endpoint);
    cursor = result.cursor;
  }
  assert.deepEqual(op.nextCandidate(cursor), { done: true });
  const endpoint = endpoints[1]!;
  assert.deepEqual(endpoint, { start: 0, end: 2, height: 2, unit: { start: 1, end: 2, height: 1, top: 1 } });
  const range = op.materializeCandidate(endpoint);
  assert.deepEqual(op.counts(), {
    attempts: 6,
    sourceVisits: 1,
    sourceReads: 1,
    unitsExamined: 3,
    measurements: 3,
    outputFragments: 5,
    providerUnits: 6,
  });
  const repeated = op.materializeCandidate(endpoint);
  assert.notEqual(repeated, range);
  assert.notEqual(repeated.units, range.units);
  assert.equal(repeated.units[0], range.units[0]);
  assert.equal(range.units[0]!.content, content);
  assert.equal(op.counts().outputFragments, 7);
  for (const value of [endpoint, endpoint.unit, cursor, range, range.units, range.units[0]!])
    assert.ok(Object.isFrozen(value));
  assert.equal(Object.isFrozen(content), false);
  assert.deepEqual(Reflect.ownKeys(cursor), []);
});

test("1000 endpoints cost one provider unit each, then only the chosen prefix is copied", () => {
  let calls = 0;
  const op = createFragmentOperation({
    next: (_, { offset }, work) => {
      calls++;
      work.consume(1);
      return { end: offset + 1, height: 0, content: offset };
    },
  });
  let cursor = op.candidates(op.prepare(source(1000)), query);
  const endpoints: CandidateEndpoint[] = [];
  for (let i = 0; i < 1000; i++) {
    const result = op.nextCandidate(cursor);
    if (result.done) throw new Error("expected candidate");
    endpoints.push(result.endpoint);
    cursor = result.cursor;
  }
  assert.deepEqual(op.nextCandidate(cursor), { done: true });
  const range = op.materializeCandidate(endpoints[499]!);
  assert.equal(range.units.length, 500);
  assert.equal(calls, 1000);
  assert.deepEqual(op.counts(), {
    attempts: 1003,
    sourceVisits: 1,
    sourceReads: 1,
    unitsExamined: 1000,
    measurements: 1000,
    outputFragments: 1500,
    providerUnits: 1000,
  });
  assert.deepEqual(Reflect.ownKeys(endpoints[0]!), ["start", "end", "height", "unit"]);
  assert.deepEqual(Reflect.ownKeys(endpoints[0]!.unit), ["start", "end", "height", "top"]);
});

test("empty and end-offset enumerations have no endpoint or provider work; legacy empty selection remains", () => {
  for (const extent of [0, 3]) {
    const op = createFragmentOperation({
      next: () => {
        throw new Error("unexpected provider");
      },
    });
    const prepared = op.prepare(source(extent));
    const cursor = op.candidates(prepared, { ...query, offset: extent });
    assert.deepEqual(op.nextCandidate(cursor), { done: true });
    assert.deepEqual(op.counts(), {
      attempts: 2,
      sourceVisits: 1,
      sourceReads: 1,
      unitsExamined: 0,
      measurements: 0,
      outputFragments: 0,
      providerUnits: 0,
    });
    assert.deepEqual(op.select(prepared, { ...query, offset: extent, height: 0, usedHeight: 0 })!.units, []);
  }
});

test("grouped zero-height units, nonzero start, and atomic whole extent", () => {
  for (const atomic of [false, true]) {
    const op = createFragmentOperation({ next: (_, { extent }) => ({ end: extent, height: 0, content: null }) });
    const input = { ...source(6), mode: atomic ? ("atomic" as const) : ("splittable" as const) };
    const start = atomic ? 0 : 2;
    const result = op.nextCandidate(op.candidates(op.prepare(input), { ...query, offset: start }));
    if (result.done) throw new Error("expected candidate");
    assert.deepEqual(result.endpoint, { start, end: 6, height: 0, unit: { start, end: 6, height: 0, top: 0 } });
    assert.deepEqual(op.nextCandidate(result.cursor), { done: true });
  }
});

test("prefix height is compensated and top is the pre-add snapshot, not rounded subtraction", () => {
  const heights = [1e16, 1, 1, 3];
  const op = createFragmentOperation({
    next: (_, { offset }) => ({ end: offset + 1, height: heights[offset]!, content: null }),
  });
  let cursor = op.candidates(op.prepare(source(4)), query);
  for (let i = 0; i < heights.length; i++) {
    const result = op.nextCandidate(cursor);
    if (result.done) throw new Error("expected candidate");
    assert.equal(result.endpoint.height, sum(heights.slice(0, i + 1)));
    assert.equal(result.endpoint.unit.top, sum(heights.slice(0, i)));
    assert.equal(op.materializeCandidate(result.endpoint).height, result.endpoint.height);
    cursor = result.cursor;
  }
});

test("finite unit overflow poisons before publishing a candidate", () => {
  const op = createFragmentOperation({
    next: (_, { offset }) => ({ end: offset + 1, height: Number.MAX_VALUE, content: null }),
  });
  const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
  if (first.done) throw new Error("expected candidate");
  assert.throws(
    () => op.nextCandidate(first.cursor),
    (e) => e instanceof LayoutInputError && e.code === "GEOMETRY",
  );
  assert.equal(op.counts().outputFragments, 2);
  assert.throws(() => op.materializeCandidate(first.endpoint));
});

test("independent reflow enumerations keep exact authored width, without caching or mixing prefixes", () => {
  const widths: number[] = [];
  const op = createFragmentOperation({
    next: (_, { offset, width }) => {
      widths.push(width);
      return { end: offset + 1, height: width, content: null };
    },
  });
  const prepared = op.prepare({ ...source(), width: { mode: "reflow" } });
  const a = op.nextCandidate(op.candidates(prepared, query));
  const b = op.nextCandidate(op.candidates(prepared, { ...query, width: 10 + 2 * Number.EPSILON * 10 }));
  if (a.done || b.done) throw new Error("expected candidate");
  const second = op.nextCandidate(a.cursor);
  if (second.done) throw new Error("expected candidate");
  assert.deepEqual(widths, [query.width, b.endpoint.height, query.width]);
  assert.notEqual(widths[0], widths[1]);
  assert.equal(second.endpoint.height, 20);
  assert.equal(op.materializeCandidate(b.endpoint).height, widths[1]);
});
