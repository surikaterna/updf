import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "../src/error.js";
import { createFragmentOperation, type FragmentSource } from "../src/fragmentation.js";
import { rangeRequest } from "../src/fragment-source.js";
import { bits, successor, value } from "../src/numeric.js";
import { derivedAxis, materializedStart } from "../src/geometry.js";

const nextUp = (n: number) => value(successor(bits(n))!);
const request = { offset: 0, width: 1, height: 1, usedHeight: nextUp(1) };
const region = { id: "r", width: 1, height: 1, usedHeight: request.usedHeight };
const source: FragmentSource<null> = {
  id: "s",
  path: "/s",
  descriptor: null,
  extent: 2,
  mode: "splittable",
  width: { mode: "fixed", value: 1 },
};
const errorAt = (code: string, path: string) => (error: unknown) =>
  error instanceof LayoutInputError && error.code === code && error.path === path;

test("occupancy relation accepts the formula boundary without changing the request snapshot", () => {
  let outside = 1,
    inside = 1;
  while (outside - 1 <= Math.max(outside, 1) * 2 * Number.EPSILON) {
    inside = outside;
    outside = nextUp(outside);
  }
  for (const usedHeight of [1, nextUp(1), inside]) {
    const input = { ...request, usedHeight };
    const snapshot = rangeRequest(input);
    assert.deepEqual(snapshot, input);
    assert.ok(Object.isFrozen(snapshot));
    input.usedHeight = 0;
    assert.equal(snapshot.usedHeight, usedHeight);
  }
  for (const usedHeight of [outside, 1 + 8 * Number.EPSILON])
    assert.throws(() => rangeRequest({ ...request, usedHeight }), errorAt("GEOMETRY", "/request/usedHeight"));
});

test("near-boundary empty regions finish without provider work and preserve cumulative limits", () => {
  const op = createFragmentOperation(
    {
      next: () => {
        throw new Error("Unexpected provider");
      },
    },
    { attempts: 2 },
  );
  const cursor = op.start({
    count: 0,
    at: () => {
      throw new Error("Unexpected source");
    },
  });
  const result = op.fragment(cursor, region);
  assert.equal(result.status, "done");
  assert.deepEqual(result.placements, []);
  assert.deepEqual(op.counts(), {
    attempts: 2,
    sourceVisits: 0,
    sourceReads: 0,
    measurements: 0,
    unitsExamined: 0,
    outputFragments: 0,
    providerUnits: 0,
  });
  assert.throws(() => op.fragment(result.cursor, region), errorAt("LIMIT", "/work/attempts"));
});

test("near-boundary zero units progress with unchanged occupied origin; positive overflow blocks", () => {
  for (const height of [0, 8 * Number.EPSILON]) {
    const op = createFragmentOperation({ next: (_, { offset }) => ({ end: offset + 1, height, content: offset }) });
    const selected = op.select(op.prepare(source), request);
    if (height === 0) {
      assert.deepEqual([selected!.start, selected!.end, selected!.height], [0, 2, 0]);
      const cursor = op.start({ count: 1, at: () => source });
      const result = op.fragment(cursor, region);
      assert.equal(result.status, "done");
      assert.deepEqual(
        result.placements.map((p) => [p.top, p.height, p.start, p.end]),
        [[request.usedHeight, 0, 0, 2]],
      );
    } else {
      assert.equal(selected, undefined);
      const cursor = op.start({ count: 1, at: () => source });
      assert.equal(op.fragment(cursor, region).status, "blocked");
    }
    op.close();
  }
});

test("occupancy tolerance never relaxes operand domains, zero subnormal allowance or integer offsets", () => {
  for (const field of ["width", "height", "usedHeight"] as const) {
    for (const invalid of [NaN, Infinity, -Infinity, -Number.MIN_VALUE, "1"])
      assert.throws(() => rangeRequest({ ...request, [field]: invalid }), errorAt("GEOMETRY", `/request/${field}`));
  }
  assert.throws(
    () => rangeRequest({ ...request, height: 0, usedHeight: Number.MIN_VALUE }),
    errorAt("GEOMETRY", "/request/usedHeight"),
  );
  assert.deepEqual(rangeRequest({ offset: 0, width: 0, height: 0, usedHeight: 0 }), {
    offset: 0,
    width: 0,
    height: 0,
    usedHeight: 0,
  });
  assert.throws(() => rangeRequest({ ...request, offset: nextUp(1) }), errorAt("LIMIT", "/request/offset"));
});

test("invalid requests and exact fixed-width identity reject before callbacks", () => {
  for (const patch of [{ usedHeight: 1 + 8 * Number.EPSILON }, { offset: nextUp(1) }, { width: nextUp(1) }]) {
    let calls = 0;
    const op = createFragmentOperation({
      next: () => {
        calls++;
        return { end: 1, height: 0, content: null };
      },
    });
    const token = op.prepare(source);
    assert.throws(() => op.select(token, { ...request, ...patch }), LayoutInputError);
    assert.equal(calls, 0);
    assert.throws(() => op.select(token, request), errorAt("VALUE", "/operation"));
  }
  assert.throws(
    () => createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) }, { attempts: nextUp(1) }),
    LayoutInputError,
  );
});

test("native interval certificates still reject an endpoint accepted as approximate occupancy", () => {
  assert.equal(rangeRequest(request).usedHeight, nextUp(1));
  const axis = derivedAxis(0, 1, "/axis");
  assert.equal(materializedStart(axis, 0, 1, "/placement"), 0);
  assert.throws(() => materializedStart(axis, 0, nextUp(1), "/placement"), errorAt("GEOMETRY", "/placement"));
  assert.throws(() => derivedAxis(1, 1, "/axis"), errorAt("GEOMETRY", "/axis"));
});

test("fractional source extent, view count and provider work remain exact safe-integer contracts", () => {
  const make = () => createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) });
  assert.throws(() => make().prepare({ ...source, extent: nextUp(1) }), errorAt("LIMIT", "/s"));
  assert.throws(() => make().start({ count: nextUp(1), at: () => source }), LayoutInputError);
  const op = createFragmentOperation({
    next: (_, __, work) => {
      work.consume(nextUp(1));
      return { end: 1, height: 0, content: null };
    },
  });
  assert.throws(() => op.select(op.prepare(source), request), LayoutInputError);
});
