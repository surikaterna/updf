import assert from "node:assert/strict";
import test from "node:test";
import { createFragmentOperation, createRangeOperation } from "../src/fragmentation.js";

const input = (extent: number) => ({
  id: "complete",
  path: "/complete",
  descriptor: {},
  extent,
  mode: "splittable" as const,
  width: { mode: "fixed" as const, value: 8 },
});
const request = { mode: "complete" as const, offset: 0, width: 8 };

for (const factory of [createRangeOperation, createFragmentOperation]) {
  test(`${factory.name}: complete selection consumes every legal unit without a height sentinel`, () => {
    const queries: unknown[] = [];
    const content = {};
    const operation = factory({
      next: (_, query, work) => {
        queries.push(query);
        assert.ok(Object.isFrozen(query));
        assert.deepEqual(Object.keys(query), ["offset", "extent", "width"]);
        work.consume(2);
        return { end: query.offset + 1, height: 40, content };
      },
    });
    const source = operation.prepare(input(3));
    const bounded = operation.select(source, { offset: 0, width: 8, height: 40, usedHeight: 0 })!;
    assert.equal(bounded.end, 1);
    const all = operation.select(source, request)!;
    assert.deepEqual([all.start, all.end, all.height], [0, 3, 120]);
    assert.equal(queries.length, 5);
    assert.ok(Object.isFrozen(all) && Object.isFrozen(all.units));
    assert.ok(all.units.every((unit) => unit.content === content && Object.isFrozen(unit)));
    assert.deepEqual(operation.counts(), {
      attempts: 2,
      sourceVisits: 2,
      sourceReads: 1,
      measurements: 5,
      unitsExamined: 5,
      outputFragments: 4,
      providerUnits: 10,
    });
    assert.equal(operation.select(source, { ...request, offset: 2 })!.height, 40);
    operation.close();
  });

  test(`${factory.name}: complete selection keeps finite work limits and poisoning`, () => {
    let calls = 0;
    const operation = factory(
      {
        next: (_, { offset }) => {
          calls++;
          return { end: offset + 1, height: 0, content: null };
        },
      },
      { measurements: 1 },
    );
    const source = operation.prepare(input(3));
    assert.throws(() => operation.select(source, request), { code: "LIMIT", path: "/work/measurements" });
    assert.equal(calls, 1);
    assert.equal(operation.counts().outputFragments, 1);
    assert.equal(operation.counts().unitsExamined, 2);
    assert.throws(() => operation.select(source, request), /closed/);
  });

  test(`${factory.name}: complete selection rejects total overflow and exact width mismatch`, () => {
    const operation = factory({
      next: (_, { offset }) => ({ end: offset + 1, height: Number.MAX_VALUE, content: null }),
    });
    const source = operation.prepare(input(2));
    assert.throws(() => operation.select(source, request), { code: "GEOMETRY", path: "/complete" });
    assert.equal(operation.counts().measurements, 2);
    assert.throws(() => operation.select(source, request), /closed/);
    const other = factory({
      next: () => {
        throw new Error("must not measure");
      },
    });
    const prepared = other.prepare(input(1));
    assert.throws(() => other.select(prepared, { ...request, width: 8 + 2 ** -49 }), {
      code: "VALUE",
      path: "/complete",
    });
    assert.equal(other.counts().measurements, 0);
  });

  test(`${factory.name}: empty and zero-height units retain finite source progress`, () => {
    const operation = factory({ next: (_, { offset }) => ({ end: offset + 1, height: 0, content: offset }) });
    const source = operation.prepare(input(3));
    const all = operation.select(source, request)!;
    assert.equal(all.end, 3);
    assert.equal(all.height, 0);
    assert.equal(all.units.length, 3);
    assert.deepEqual(operation.select(source, { ...request, offset: 3 }), { start: 3, end: 3, height: 0, units: [] });
    operation.close();
  });
}

test("complete mode is explicit and cannot mix capacity fields or execute request accessors", () => {
  const invalid = [
    { offset: 0, width: 8 },
    { ...request, height: 1 },
    { ...request, usedHeight: 0 },
    { ...request, mode: undefined },
    { ...request, mode: "other" },
  ];
  for (const query of invalid) {
    const operation = createRangeOperation({
      next: () => {
        throw new Error("callback ran");
      },
    });
    const source = operation.prepare(input(1));
    assert.throws(() => operation.select(source, query as typeof request));
    assert.equal(operation.counts().measurements, 0);
  }
  let reads = 0;
  const query = { ...request };
  Object.defineProperty(query, "mode", {
    enumerable: true,
    get: () => {
      reads++;
      return "complete";
    },
  });
  const operation = createRangeOperation({
    next: () => {
      throw new Error("callback ran");
    },
  });
  const source = operation.prepare(input(1));
  assert.throws(() => operation.select(source, query), { code: "TYPE", path: "/request/mode" });
  assert.equal(reads, 0);
});

test("complete selection preserves indivisible groups, atomic whole sources and immutable empty results", () => {
  let calls = 0;
  const operation = createRangeOperation({
    next: (_, query) => {
      calls++;
      return { end: query.extent, height: 3, content: query.offset };
    },
  });
  const source = operation.prepare({ ...input(4), mode: "atomic" });
  const all = operation.select(source, request)!;
  assert.deepEqual(
    all.units.map((unit) => [unit.start, unit.end]),
    [[0, 4]],
  );
  assert.equal(calls, 1);
  const empty = operation.select(source, { ...request, offset: 4 })!;
  assert.deepEqual(empty, { start: 4, end: 4, height: 0, units: [] });
  assert.ok(Object.isFrozen(empty) && Object.isFrozen(empty.units));
  assert.equal(calls, 1);
  assert.throws(() => operation.select(source, { ...request, offset: 1 }), { code: "VALUE", path: "/complete" });
  assert.equal(calls, 1);
});

test("complete selection honors output quota and poisons without returning a range", () => {
  let calls = 0;
  const content = {};
  const operation = createRangeOperation(
    {
      next: () => {
        calls++;
        return { end: 1, height: 1, content };
      },
    },
    { outputFragments: 0 },
  );
  const source = operation.prepare(input(1));
  assert.throws(() => operation.select(source, request), { code: "LIMIT", path: "/work/outputFragments" });
  assert.equal(calls, 1);
  assert.equal(operation.counts().outputFragments, 0);
  assert.equal(Object.isFrozen(content), false);
  assert.throws(() => operation.select(source, request), /closed/);
});
