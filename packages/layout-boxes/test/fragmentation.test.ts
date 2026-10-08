import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "../src/error.js";
import {
  createFragmentOperation,
  type FragmentCursor,
  type FragmentSource,
  type ProviderWork,
} from "../src/fragmentation.js";

const source = (extent = 3, mode: "atomic" | "splittable" = "splittable"): FragmentSource<object> => ({
  id: "a",
  path: "/a",
  descriptor: {},
  extent,
  mode,
  width: { mode: "fixed", value: 10 },
});
const request = { offset: 0, width: 10, height: 2, usedHeight: 0 };
const code =
  (expected: string) =>
  (error: unknown): boolean =>
    error instanceof LayoutInputError && error.code === expected;

test("prepared selectors charge repeated trials and the first rejected unit; opaque content remains host-owned", () => {
  const content = {};
  const operation = createFragmentOperation({
    next: (_, { offset }, work) => {
      work.consume(2);
      return { end: offset + 1, height: 1, content };
    },
  });
  const prepared = operation.prepare(source());
  const range = operation.select(prepared, request)!;
  assert.deepEqual([range.start, range.end, range.height], [0, 2, 2]);
  assert.ok(Object.isFrozen(range) && Object.isFrozen(range.units) && Object.isFrozen(range.units[0]));
  assert.equal(range.units[0]!.content, content);
  assert.equal(Object.isFrozen(content), false);
  operation.select(prepared, request);
  assert.deepEqual(operation.counts(), {
    attempts: 2,
    sourceVisits: 2,
    sourceReads: 1,
    measurements: 6,
    unitsExamined: 6,
    outputFragments: 4,
    providerUnits: 12,
  });
  assert.ok(Object.isFrozen(operation.counts()));
});
test("fixed-width mismatch precedes provider and poisons operation", () => {
  let calls = 0;
  const op = createFragmentOperation({
    next: () => {
      calls++;
      return { end: 1, height: 1, content: null };
    },
  });
  const prepared = op.prepare(source());
  assert.throws(() => op.select(prepared, { ...request, width: 9 }), code("VALUE"));
  assert.equal(calls, 0);
  assert.throws(() => op.select(prepared, request), code("VALUE"));
});
test("empty extent skips provider; zero-height units must still strictly progress", () => {
  let calls = 0;
  const op = createFragmentOperation({
    next: (_, { offset }) => {
      calls++;
      return { end: offset + 1, height: 0, content: null };
    },
  });
  assert.equal(op.select(op.prepare(source(0)), request)!.units.length, 0);
  assert.equal(calls, 0);
  const next = { ...source(3), id: "b" };
  assert.equal(op.select(op.prepare(next), { ...request, height: 0 })!.end, 3);
  assert.equal(calls, 3);
  const bad = createFragmentOperation({ next: () => ({ end: 0, height: 0, content: null }) });
  assert.throws(() => bad.select(bad.prepare(source()), request), code("VALUE"));
});
test("atomic units consume the whole extent and cannot partially fit", () => {
  const op = createFragmentOperation({ next: () => ({ end: 3, height: 3, content: null }) });
  const prepared = op.prepare(source(3, "atomic"));
  assert.equal(op.select(prepared, request), undefined);
  assert.equal(op.select(prepared, { ...request, height: 3 })!.end, 3);
  const bad = createFragmentOperation({ next: () => ({ end: 1, height: 1, content: null }) });
  assert.throws(() => bad.select(bad.prepare(source(3, "atomic")), request), code("VALUE"));
});
test("quotas charge before callbacks and retain failed-selector work", () => {
  let calls = 0;
  const op = createFragmentOperation(
    {
      next: (_, { offset }) => {
        calls++;
        return { end: offset + 1, height: 1, content: null };
      },
    },
    { measurements: 2 },
  );
  assert.throws(() => op.select(op.prepare(source()), request), code("LIMIT"));
  assert.equal(calls, 2);
  assert.equal(op.counts().measurements, 2);
  assert.equal(op.counts().unitsExamined, 3);
  assert.equal(op.counts().outputFragments, 2);
});
test("provider work handles expire, validate integer units, and poison even when a callback catches a failure", () => {
  let retained: ProviderWork | undefined;
  const op = createFragmentOperation({
    next: (_, { offset }, work) => {
      retained = work;
      return { end: offset + 1, height: 1, content: null };
    },
  });
  const prepared = op.prepare(source(1));
  op.select(prepared, request);
  assert.throws(() => retained!.consume(1), code("VALUE"));
  assert.throws(() => op.select(prepared, request), code("VALUE"));
  const caught = createFragmentOperation({
    next: (_, __, work) => {
      assert.throws(() => work.consume(0.5), code("LIMIT"));
      return { end: 1, height: 0, content: null };
    },
  });
  assert.throws(() => caught.select(caught.prepare(source(1)), request), code("VALUE"));
});
test("explicit region continuations preserve changed width, used origin and B placements", () => {
  const widths: number[] = [];
  const op = createFragmentOperation({
    next: (_, { offset, width }) => {
      widths.push(width);
      return { end: offset + 1, height: 1, content: offset };
    },
  });
  const input = { ...source(), width: { mode: "reflow" as const } };
  const start = op.start({ count: 1, at: () => input });
  const first = op.fragment(start, { id: "one", width: 2, height: 2, usedHeight: 1 });
  assert.equal(first.status, "region-full");
  assert.equal(first.placements[0]!.top, 1);
  assert.deepEqual([first.placements[0]!.start, first.placements[0]!.end], [0, 1]);
  const second = op.fragment(first.cursor, { id: "two", width: 4, height: 2, usedHeight: 0 });
  assert.equal(second.status, "done");
  assert.deepEqual(widths, [2, 2, 4, 4]);
  assert.equal(op.counts().sourceReads, 1);
});
test("blocked continuations advance token identity, replay/foreign/closed tokens fail before providers", () => {
  let calls = 0;
  const make = () =>
    createFragmentOperation({
      next: () => {
        calls++;
        return { end: 1, height: 2, content: null };
      },
    });
  const op = make();
  const old = op.start({ count: 1, at: () => source(1) });
  const blocked = op.fragment(old, { id: "r", width: 10, height: 1, usedHeight: 0 });
  assert.equal(blocked.status, "blocked");
  assert.notEqual(old, blocked.cursor);
  assert.throws(() => op.fragment(old, { id: "r", width: 10, height: 2, usedHeight: 0 }), code("VALUE"));
  assert.equal(calls, 1);
  const foreign = make();
  assert.throws(
    () => foreign.fragment(blocked.cursor, { id: "r", width: 10, height: 2, usedHeight: 0 }),
    code("VALUE"),
  );
  const closed = make();
  const cursor = closed.start({ count: 0, at: () => source() });
  closed.close();
  assert.throws(() => closed.fragment(cursor, { id: "r", width: 10, height: 2, usedHeight: 0 }), code("VALUE"));
  assert.equal(calls, 1);
});
test("forged token and own-record accessors are rejected without getter execution", () => {
  let getters = 0;
  const op = createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) });
  const token = Object.defineProperty({}, "id", {
    get() {
      getters++;
      return "x";
    },
  }) as FragmentCursor;
  assert.throws(() => op.fragment(token, { id: "r", width: 10, height: 1, usedHeight: 0 }), code("VALUE"));
  const bad = createFragmentOperation({
    next: () =>
      Object.defineProperty({ end: 1, content: null }, "height", {
        enumerable: true,
        get() {
          getters++;
          return 0;
        },
      }) as { end: number; height: number; content: null },
  });
  assert.throws(() => bad.select(bad.prepare(source(1)), request), code("TYPE"));
  assert.equal(getters, 0);
});
test("host errors retain identity and counts/view limits precede indexed access", () => {
  const error = {};
  const op = createFragmentOperation({
    next: () => {
      throw error;
    },
  });
  assert.throws(
    () => op.select(op.prepare(source(1)), request),
    (actual) => actual === error,
  );
  let reads = 0;
  const limited = createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) }, { sourceReads: 0 });
  assert.throws(
    () =>
      limited.start({
        count: 1,
        at: () => {
          reads++;
          return source();
        },
      }),
    code("LIMIT"),
  );
  assert.equal(reads, 0);
});
test("strict own results resist Object.prototype descriptor accessors without evaluation", () => {
  let calls = 0;
  Object.defineProperty(Object.prototype, "value", {
    configurable: true,
    get() {
      calls++;
      return 1;
    },
  });
  try {
    const op = createFragmentOperation({
      next: () => ({
        end: 1,
        content: null,
        get height() {
          calls++;
          return 1;
        },
      }),
    });
    assert.throws(() => op.select(op.prepare(source(1)), request), code("TYPE"));
    assert.equal(calls, 0);
  } finally {
    Reflect.deleteProperty(Object.prototype, "value");
  }
});
test("unit bounds, heights and immutable unique source identities reject malformed results", () => {
  for (const unit of [
    { end: 4, height: 1 },
    { end: 0.5, height: 1 },
    { end: 1, height: -1 },
    { end: 1, height: Number.NaN },
    { end: 1, height: Number.POSITIVE_INFINITY },
  ]) {
    const op = createFragmentOperation({ next: () => ({ ...unit, content: null }) });
    assert.throws(() => op.select(op.prepare(source()), request), LayoutInputError);
  }
  const op = createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) });
  const input = source();
  op.prepare(input);
  assert.throws(() => op.prepare({ ...input, extent: 2 }), code("VALUE"));
  const duplicate = createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) });
  const repeated = source(1);
  const cursor = duplicate.start({ count: 2, at: () => repeated });
  assert.throws(() => duplicate.fragment(cursor, { id: "r", width: 10, height: 5, usedHeight: 0 }), code("VALUE"));
});
test("repeated blocked regions hit the explicit attempt boundary before another provider call", () => {
  let calls = 0;
  const op = createFragmentOperation(
    {
      next: () => {
        calls++;
        return { end: 1, height: 2, content: null };
      },
    },
    { attempts: 3 },
  );
  const input = source(1);
  let cursor = op.start({ count: 1, at: () => input });
  const region = { id: "r", width: 10, height: 1, usedHeight: 0 };
  for (let index = 0; index < 2; index++) {
    const result = op.fragment(cursor, region);
    assert.equal(result.status, "blocked");
    cursor = result.cursor;
  }
  assert.throws(() => op.fragment(cursor, region), code("LIMIT"));
  assert.equal(calls, 2);
  assert.equal(op.counts().attempts, 3);
});
