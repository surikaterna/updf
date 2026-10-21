import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "../src/error.js";
import { type CandidateCursor, type CandidateEndpoint, createFragmentOperation } from "../src/fragmentation.js";
import { bits, successor, value } from "../src/numeric.js";

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
const make = () =>
  createFragmentOperation({ next: (_, { offset }) => ({ end: offset + 1, height: 0, content: null }) });

for (const kind of ["forged", "copied", "consumed", "foreign", "endpoint", "region", "source", "null"] as const) {
  test(`next rejects ${kind} token, charges one malformed attempt, poisons; closed calls do not charge`, () => {
    const op = make();
    const prepared = op.prepare(source());
    const cursor = op.candidates(prepared, query);
    const result = op.nextCandidate(cursor);
    if (result.done) throw new Error("expected candidate");
    const foreign = make();
    const tokens = {
      forged: {},
      copied: { ...result.cursor },
      consumed: cursor,
      foreign: foreign.candidates(foreign.prepare(source()), query),
      endpoint: result.endpoint,
      region: op.start({ count: 0, at: source }),
      source: prepared,
      null: null,
    };
    const before = op.counts().attempts;
    assert.throws(() => op.nextCandidate(tokens[kind] as CandidateCursor), code("VALUE"));
    assert.equal(op.counts().attempts, before + 1);
    assert.throws(() => op.nextCandidate(result.cursor), code("VALUE"));
    assert.equal(op.counts().attempts, before + 1);
  });
}

for (const kind of ["forged", "copied", "foreign", "cursor", "region", "source", "null"] as const) {
  test(`materialization rejects ${kind} endpoint before output work`, () => {
    const op = make();
    const prepared = op.prepare(source());
    const first = op.nextCandidate(op.candidates(prepared, query));
    const foreign = make();
    const other = foreign.nextCandidate(foreign.candidates(foreign.prepare(source()), query));
    if (first.done || other.done) throw new Error("expected candidate");
    const tokens = {
      forged: {},
      copied: { ...first.endpoint },
      foreign: other.endpoint,
      cursor: first.cursor,
      region: op.start({ count: 0, at: source }),
      source: prepared,
      null: null,
    };
    const before = op.counts().attempts;
    assert.throws(() => op.materializeCandidate(tokens[kind] as CandidateEndpoint), code("VALUE"));
    assert.equal(op.counts().attempts, before + 1);
    assert.equal(op.counts().outputFragments, 1);
  });
}

test("candidate tokens cannot cross into legacy region or source APIs", () => {
  for (const kind of ["source", "region"] as const) {
    const op = make();
    const first = op.nextCandidate(op.candidates(op.prepare(source()), query));
    if (first.done) throw new Error("expected candidate");
    const call = () =>
      kind === "source"
        ? op.select(first.endpoint as never, { ...query, height: 1, usedHeight: 0 })
        : op.fragment(first.cursor as never, { id: "r", width: 10, height: 1, usedHeight: 0 });
    assert.throws(call, code("VALUE"));
    assert.equal(op.counts().measurements, 1);
  }
});

test("strict request validation and fixed next-float width mismatch precede provider", () => {
  let getters = 0;
  const accessor = Object.defineProperty({ offset: 0 }, "width", {
    get: () => {
      getters++;
      return 10;
    },
  });
  for (const request of [
    null,
    { ...query, extra: 1 },
    { ...query, height: 1 },
    Object.create(query),
    accessor,
    { ...query, width: value(successor(bits(10))!) },
    { ...query, offset: 4 },
    { ...query, offset: -1 },
    { ...query, offset: 0.5 },
    { ...query, offset: Number.MAX_SAFE_INTEGER + 1 },
    { ...query, width: -1 },
    { ...query, width: Number.NaN },
    { ...query, width: Infinity },
  ]) {
    const op = createFragmentOperation({
      next: () => {
        throw new Error("unexpected provider");
      },
    });
    assert.throws(() => op.candidates(op.prepare(source()), request as never), LayoutInputError);
    assert.equal(op.counts().attempts, 1);
    assert.equal(op.counts().sourceVisits, 1);
    assert.equal(op.counts().measurements, 0);
  }
  assert.equal(getters, 0);
  const atomic = make();
  assert.throws(
    () => atomic.candidates(atomic.prepare({ ...source(), mode: "atomic" }), { ...query, offset: 1 }),
    code("VALUE"),
  );
});

test("shared provider validation rejects illegal progress, atomic fragments, malformed content and height", () => {
  for (const result of [
    { end: 0, height: 0, content: null },
    { end: 4, height: 0, content: null },
    { end: 0.5, height: 0, content: null },
    { end: 1, height: -1, content: null },
    { end: 1, height: Infinity, content: null },
    { end: 1, height: NaN, content: null },
    { end: 1, height: 0 },
    { end: 1, height: 0, content: null, extra: true },
  ]) {
    const op = createFragmentOperation({ next: () => result as { end: number; height: number; content: null } });
    const cursor = op.candidates(op.prepare(source()), query);
    assert.throws(() => op.nextCandidate(cursor), LayoutInputError);
    assert.equal(op.counts().measurements, 1);
    assert.equal(op.counts().outputFragments, 0);
  }
  const op = make();
  const cursor = op.candidates(op.prepare({ ...source(), mode: "atomic" }), query);
  assert.throws(() => op.nextCandidate(cursor), code("VALUE"));
});

test("explicit close rejects all new methods with no new charges", () => {
  const op = make();
  const prepared = op.prepare(source());
  const first = op.nextCandidate(op.candidates(prepared, query));
  if (first.done) throw new Error("expected candidate");
  const counts = op.counts();
  op.close();
  assert.throws(() => op.candidates(prepared, query), code("VALUE"));
  assert.throws(() => op.nextCandidate(first.cursor), code("VALUE"));
  assert.throws(() => op.materializeCandidate(first.endpoint), code("VALUE"));
  assert.deepEqual(op.counts(), counts);
});
