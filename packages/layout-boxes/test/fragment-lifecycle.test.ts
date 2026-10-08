import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "../src/error.js";
import { createFragmentOperation, type FragmentCursor, type PreparedSource } from "../src/fragmentation.js";

const source = () => ({
  id: "a",
  path: "/a",
  descriptor: {},
  extent: 3,
  mode: "splittable" as const,
  width: { mode: "fixed" as const, value: 10 },
});
const request = { offset: 0, width: 10, height: 0, usedHeight: 0 };
const region = { id: "r", width: 10, height: 0, usedHeight: 0 };
const code = (expected: string) => (error: unknown) => error instanceof LayoutInputError && error.code === expected;

for (const mode of ["select", "region"] as const) {
  for (const action of ["close", "quota", "valid-reentry", "invalid-reentry"] as const) {
    test(`callback barrier stops multiunit ${mode} after ${action}`, () => {
      let calls = 0;
      const op = createFragmentOperation(
        {
          next: (_, { offset }, work) => {
            calls++;
            if (action === "close") op.close();
            if (action === "quota") assert.throws(() => work.consume(1), code("LIMIT"));
            if (action.endsWith("reentry")) {
              const token = action === "valid-reentry" ? prepared : ({} as PreparedSource);
              assert.throws(() => op.select(token, request), code("VALUE"));
            }
            assert.throws(() => work.consume(0), code("VALUE"));
            return { end: offset + 1, height: 0, content: null };
          },
        },
        { providerUnits: 0 },
      );
      const input = source();
      const prepared = op.prepare(input);
      const attempt = () =>
        mode === "select" ? op.select(prepared, request) : op.fragment(op.start({ count: 1, at: () => input }), region);
      assert.throws(attempt, code("VALUE"));
      assert.equal(calls, 1);
      assert.equal(op.counts().measurements, 1);
      assert.equal(op.counts().outputFragments, 0);
      assert.equal(op.counts().providerUnits, 0);
    });
  }
}

test("view close stops before source snapshot or provider access", () => {
  let calls = 0;
  const op = createFragmentOperation({
    next: () => {
      calls++;
      return { end: 1, height: 0, content: null };
    },
  });
  const cursor = op.start({
    count: 1,
    at: () => {
      op.close();
      return source();
    },
  });
  assert.throws(() => op.fragment(cursor, region), code("VALUE"));
  assert.equal(calls, 0);
  assert.equal(op.counts().outputFragments, 0);
});

test("escaping host exception keeps identity after close", () => {
  const error = new Error("host");
  const op = createFragmentOperation({
    next: () => {
      op.close();
      throw error;
    },
  });
  assert.throws(
    () => op.select(op.prepare(source()), request),
    (caught) => caught === error,
  );
  const viewOp = createFragmentOperation({ next: () => ({ end: 1, height: 0, content: null }) });
  const cursor = viewOp.start({
    count: 1,
    at: () => {
      viewOp.close();
      throw error;
    },
  });
  assert.throws(
    () => viewOp.fragment(cursor, region),
    (caught) => caught === error,
  );
});

test("output quota precedes accepted unit record freeze", () => {
  const freeze = Object.freeze;
  let accepted = 0;
  Object.freeze = ((value: object) => {
    if (Object.hasOwn(value, "start") && Object.hasOwn(value, "content")) accepted++;
    return freeze(value);
  }) as typeof Object.freeze;
  try {
    for (const cap of [0, 1]) {
      accepted = 0;
      const op = createFragmentOperation(
        { next: (_, { offset }) => ({ end: offset + 1, height: 0, content: null }) },
        { outputFragments: cap },
      );
      assert.throws(() => op.select(op.prepare(source()), request), code("LIMIT"));
      assert.equal(accepted, cap);
      assert.equal(op.counts().outputFragments, cap);
      assert.equal(op.counts().measurements, cap + 1);
    }
  } finally {
    Object.freeze = freeze;
  }
});

test("active malformed cursor and prepared attempts share the ledger; closed calls do not charge", () => {
  for (const kind of ["cursor", "prepared"] as const) {
    const op = createFragmentOperation({
      next: () => {
        throw new Error("unexpected callback");
      },
    });
    const attempt = () =>
      kind === "cursor" ? op.fragment({} as FragmentCursor, region) : op.select({} as PreparedSource, request);
    assert.throws(attempt, code("VALUE"));
    assert.equal(op.counts().attempts, 1);
    assert.throws(attempt, code("VALUE"));
    assert.equal(op.counts().attempts, 1);
  }
});

test("valid, replayed and foreign cursor attempts charge once without callbacks", () => {
  const op = createFragmentOperation({
    next: () => {
      throw new Error("unexpected callback");
    },
  });
  const first = op.start({ count: 0, at: () => source() });
  op.fragment(first, region);
  assert.equal(op.counts().attempts, 2);
  assert.throws(() => op.fragment(first, region), code("VALUE"));
  assert.equal(op.counts().attempts, 3);
  const other = createFragmentOperation({
    next: () => {
      throw new Error("unexpected callback");
    },
  });
  assert.throws(() => other.fragment(first, region), code("VALUE"));
  assert.equal(other.counts().attempts, 1);
});
