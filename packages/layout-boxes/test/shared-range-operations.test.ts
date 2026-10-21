import assert from "node:assert/strict";
import test from "node:test";
import { sharedRangeOperations } from "../src/internal-fragmentation.js";
import type { FragmentCounts, PreparedSource, ProviderWork, RangeOperation } from "../src/fragmentation.js";

const request = { mode: "complete" as const, offset: 0, width: 80 };
const source = (id: string) => ({
  id,
  path: `/${id}`,
  descriptor: id,
  extent: 1,
  mode: "atomic" as const,
  width: { mode: "fixed" as const, value: 80 },
});

test("nested operations share every exact cumulative cap, including outer in-flight work", () => {
  for (const category of [
    "attempts",
    "sourceVisits",
    "sourceReads",
    "measurements",
    "unitsExamined",
    "outputFragments",
    "providerUnits",
  ] as const) {
    const create = sharedRangeOperations<string, null>(
      {
        next: (id, _request, work) => {
          work.consume(1);
          if (id === "outer") {
            const nested = create();
            nested.select(nested.prepare(source("inner")), request);
          }
          return { end: 1, height: 1, content: null };
        },
      },
      { [category]: 1 },
    );
    const outer = create();
    const prepared = outer.prepare(source("outer"));
    assert.throws(() => outer.select(prepared, request), { code: "LIMIT", path: `/work/${category}` });
    assert.equal(outer.counts()[category], 1);
    assert.throws(() => create(), /closed/);
    assert.throws(() => outer.select(prepared, request), /closed/);
  }
});

test("nested success preserves independent source ownership, exact width and shared counts", () => {
  const create = sharedRangeOperations<string, null>({ next: () => ({ end: 1, height: 7, content: null }) });
  const first = create(),
    second = create();
  const prepared = first.prepare(source("first"));
  const nested = second.prepare(source("second"));
  assert.equal(first.select(prepared, request)?.height, 7);
  assert.equal(second.select(nested, request)?.height, 7);
  assert.deepEqual(first.counts(), second.counts());
  assert.equal(first.counts().outputFragments, 2);
  assert.throws(() => second.select(nested, { ...request, width: 80 + Number.EPSILON * 80 }), {
    code: "VALUE",
    path: "/second",
  });
  assert.throws(() => first.select(prepared, request), /closed/);
});

test("caught nested reentry cannot publish an outer result; exceptions retain identity", () => {
  let outer: RangeOperation<string, null>, prepared: PreparedSource;
  const sentinel = {};
  const create = sharedRangeOperations<string, null>({
    next: (id) => {
      if (id === "outer") {
        const nested = create();
        assert.throws(
          () => nested.select(nested.prepare(source("inner")), request),
          (error) => error === sentinel,
        );
        return { end: 1, height: 1, content: null };
      }
      assert.throws(() => outer.select(prepared, request), /Reentrant/);
      throw sentinel;
    },
  });
  outer = create();
  prepared = outer.prepare(source("outer"));
  assert.throws(() => outer.select(prepared, request), /closed/);
  assert.equal(outer.counts().outputFragments, 0);
  assert.throws(() => create(), /closed/);
});

test("expired work and explicit close poison every sibling, without resetting accounting", () => {
  let lease: ProviderWork | undefined;
  const create = sharedRangeOperations<string, null>({
    next: (_id, _request, work) => {
      lease = work;
      return { end: 1, height: 1, content: null };
    },
  });
  const first = create(),
    second = create();
  const prepared = first.prepare(source("first"));
  first.select(prepared, request);
  const counts: FragmentCounts = second.counts();
  assert.throws(() => lease!.consume(0), /expired/);
  assert.throws(() => second.prepare(source("second")), /closed/);
  first.close();
  second.close();
  assert.deepEqual(second.counts(), counts);
  assert.throws(() => create(), /closed/);
});

test("sibling source tokens stay foreign and explicit close aborts in-flight publication", () => {
  const create = sharedRangeOperations<string, null>({ next: () => ({ end: 1, height: 1, content: null }) });
  const first = create(),
    second = create();
  const prepared = first.prepare(source("first"));
  assert.throws(() => second.select(prepared, request), { code: "VALUE", path: "/source" });
  assert.throws(() => first.select(prepared, request), /closed/);
  let close: () => void;
  const closing = sharedRangeOperations<string, null>({
    next: () => {
      close();
      return { end: 1, height: 1, content: null };
    },
  });
  const outer = closing(),
    sibling = closing();
  close = sibling.close;
  const token = outer.prepare(source("outer"));
  assert.throws(() => outer.select(token, request), /closed/);
  assert.equal(outer.counts().outputFragments, 0);
});
