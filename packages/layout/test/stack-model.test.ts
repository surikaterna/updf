import assert from "node:assert/strict";
import { test } from "node:test";
import { DocumentError } from "@updf/core";
import { checkLimit } from "@updf/core/internal";
import { stack as modelStack, stackHeight as modelHeight } from "../src/flow-composition/stack-model.js";
import type { PreparedBlock } from "../src/protocol.js";
import { stack as hostStack, stackHeight as hostHeight } from "../src/stack.js";

function child(height: number, extent = 1, control?: "advance"): PreparedBlock & { readonly tag: string } {
  return Object.freeze({
    naturalSize: Object.freeze({ width: 2, height }),
    extent,
    fragmentation: "atomic",
    fragment: () => undefined,
    tag: "custom",
    ...(control ? { control } : {}),
  });
}

const genericStack: typeof hostStack = (children, gap, blank, capacity, path) =>
  modelStack(children, gap, blank, capacity, path, checkLimit);

for (const [name, stack, stackHeight] of [
  ["host", hostStack, hostHeight],
  ["generic", genericStack, modelHeight],
] as const) {
  test(`${name} stack empty and blank entries retain capacity fallbacks and zero extent`, () => {
    for (const capacity of [5, 0, -1]) {
      for (const blank of [0, 3]) {
        const result = stack([], 7, blank, capacity, "/stack");
        const cap = capacity > 0 ? capacity : Math.max(blank, 1);
        const extent = blank ? Math.ceil(blank / cap) + 42 : 1;
        assert.deepEqual(result, {
          entries: [{ start: 0, end: extent, space: { height: blank, capacity: cap } }],
          extent,
          height: blank,
        });
      }
    }
    assert.deepEqual(
      stack([child(0, 0)], 0, 0, 0, "/stack").entries.map(({ start, end }) => [start, end]),
      [
        [0, 0],
        [0, 1],
      ],
    );
    assert.equal(stackHeight([], 1), 0);
  });

  test(`${name} stack interspersed controls do not consume box gaps but contribute natural heights`, () => {
    const children = Object.freeze([child(0, 1, "advance"), child(2, 3), child(0.5, 1, "advance"), child(4, 2)]);
    const result = stack(children, 0.25, 0.5, 0, "/stack");
    assert.deepEqual(
      result.entries.map(({ start, end }) => [start, end]),
      [
        [0, 1],
        [1, 4],
        [4, 5],
        [5, 48],
        [48, 50],
        [50, 93],
      ],
    );
    assert.deepEqual(result.entries[3]?.space, { height: 0.25, capacity: 0.25 });
    assert.deepEqual(result.entries[5]?.space, { height: 0.5, capacity: 1 });
    assert.equal(result.height, 7.25);
    assert.equal(stackHeight(children, 0.25, 0.5), 7.25);
    assert.equal(result.entries[1]?.block, children[1]);
    assert.equal(children[1]?.tag, "custom");
    assert.equal(children.length, 4);
  });

  test(`${name} stack retains fractional, wide magnitude and subnormal accumulation`, () => {
    assert.equal(stackHeight([child(0.1), child(0.2)], 0, 0), 0.30000000000000004);
    assert.equal(stackHeight([child(1e16), child(1), child(1)], 0), 10000000000000002);
    const tiny = stack([child(0), child(0)], Number.MIN_VALUE, Number.MIN_VALUE, 0, "/stack");
    assert.deepEqual(
      tiny.entries.map(({ start, end }) => [start, end]),
      [
        [0, 1],
        [1, 44],
        [44, 45],
        [45, 88],
      ],
    );
    assert.equal(tiny.height, 2 * Number.MIN_VALUE);
    assert.deepEqual(
      stack([child(0), child(0)], 0.3, 0.1, 0.2, "/stack").entries.map(({ start, end }) => [start, end]),
      [
        [0, 1],
        [1, 45],
        [45, 46],
        [46, 89],
      ],
    );
  });

  test(`${name} limit failure precedes height pass and later child access`, () => {
    let reads = 0;
    const later = {
      ...child(1),
      get control(): "advance" {
        reads++;
        return "advance";
      },
    };
    const first = {
      ...child(0, Number.MAX_SAFE_INTEGER),
      get naturalSize() {
        reads++;
        return { width: 2, height: 0 };
      },
    };
    assert.throws(
      () => stack([first, child(0), later], 0, 0, 1, "/model"),
      (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        const message = "Block extent limit exceeded (maximum 9007199254740991)";
        assert.equal(error.message, message);
        assert.deepEqual(error.diagnostics, [{ code: "LIMIT", path: "/model", message }]);
        return true;
      },
    );
    assert.equal(reads, 0);
  });
}

test("generic model preserves custom child types, callback results, timing and thrown identity", () => {
  const children = Object.freeze([child(2), child(3)]);
  const calls: unknown[] = [];
  const result = modelStack(children, 0.5, 1, 2, "/custom", (...args) => {
    calls.push(args);
    return args[0];
  });
  assert.deepEqual(calls, [
    [1, Number.MAX_SAFE_INTEGER, "/custom", "Block extent"],
    [44, Number.MAX_SAFE_INTEGER, "/custom", "Block extent"],
    [45, Number.MAX_SAFE_INTEGER, "/custom", "Block extent"],
    [88, Number.MAX_SAFE_INTEGER, "/custom", "Block extent"],
  ]);
  assert.equal(result.entries[0]?.block?.tag, "custom");
  assert.equal(result.entries[0]?.block, children[0]);
  assert.equal(hostHeight, modelHeight);
  assert.equal(modelStack([], 0, 0, 1, "", () => 7).extent, 7);
  const sentinel = {};
  let reads = 0;
  const later = {
    extent: 1,
    naturalSize: { height: 0 },
    get control(): "advance" {
      reads++;
      return "advance";
    },
  };
  assert.throws(
    () =>
      modelStack([child(2), later], 0, 0, 1, "", () => {
        throw sentinel;
      }),
    (error: unknown) => error === sentinel,
  );
  assert.equal(reads, 0);
});

test("model completes all extent checks before reading natural heights in input order", () => {
  const events: string[] = [];
  const children = [0, 1].map((index) => ({
    extent: 1,
    get naturalSize() {
      events.push(`height:${index}`);
      return { height: index + 1 };
    },
  }));
  const result = modelStack(children, 0.5, 1, 1, "/order", (value) => {
    events.push(`limit:${value}`);
    return value;
  });
  assert.deepEqual(events, ["limit:1", "limit:44", "limit:45", "limit:88", "height:0", "height:1"]);
  assert.equal(result.height, 4.5);
});
