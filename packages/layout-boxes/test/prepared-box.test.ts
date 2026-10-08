import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { type PreparedBoxView, viewBox } from "@updf/layout-boxes/boxes";

function input(widths: number[], changes: Partial<PreparedBoxView> = {}): PreparedBoxView {
  return {
    width: 10,
    height: 2,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    gap: 0,
    alignItems: "start",
    childCount: widths.length,
    childAt: (index) => ({ width: widths[index]!, height: 1 }),
    path: "/row",
    ...changes,
  };
}
const geometry = (error: unknown) =>
  error instanceof LayoutInputError && error.code === "GEOMETRY" && error.path === "/row";

test("prepared rows reject true width, gap and inset overflow before placement", () => {
  for (const value of [
    input([8, 8]),
    input([5, 5], { gap: 1 }),
    input([10], { paddingLeft: 1 }),
    input([10], { paddingRight: 1 }),
    input([4, 4], { gap: 1, paddingLeft: 1, paddingRight: 1 }),
    input([], { paddingLeft: 6, paddingRight: 5 }),
    input([Number.MAX_VALUE, Number.MAX_VALUE], { width: Number.MAX_VALUE }),
  ])
    assert.throws(() => viewBox(value), geometry);
});

test("prepared exact fits preserve offsets and zero sizes at ordinary, fractional and scaled widths", () => {
  for (const scale of [1, 0.125, 1e-100, 1e100]) {
    const value = input([3 * scale, 4 * scale], {
      width: 10 * scale,
      gap: scale,
      paddingLeft: scale,
      paddingRight: scale,
    });
    const result = viewBox(value);
    assert.deepEqual(
      result.children.map(({ left, width }) => [left, width]),
      [
        [0, 3 * scale],
        [4 * scale, 4 * scale],
      ],
    );
    assert.ok(
      result.children.every(
        (child) => value.paddingLeft + child.left + child.width <= value.width - value.paddingRight,
      ),
    );
  }
  assert.equal(viewBox(input([], { paddingLeft: 5, paddingRight: 5 })).children.length, 0);
  assert.deepEqual(viewBox(input([0], { width: 0 })).children[0], { left: 0, top: 0, width: 0, height: 1 });
  assert.equal(viewBox(input([0.1, 0.2], { width: 0.3 })).children.length, 2);
});

test("prepared metadata rejects bad fields and accessors before child callbacks", () => {
  let calls = 0;
  const value = input([1], {
    childAt: () => {
      calls++;
      return { width: 1, height: 1 };
    },
  });
  for (const changes of [
    { width: NaN },
    { gap: -1 },
    { paddingRight: Infinity },
    { childCount: 100001 },
    { childCount: -1 },
  ])
    assert.throws(() => viewBox({ ...value, ...changes }), LayoutInputError);
  const accessor = Object.defineProperty({ ...value }, "width", {
    get() {
      calls++;
      throw new Error("getter");
    },
  });
  assert.throws(() => viewBox(accessor), LayoutInputError);
  assert.equal(calls, 0);
});

test("prepared children are snapshotted once and invalid child sizes never invoke getters", () => {
  let calls = 0;
  assert.throws(
    () =>
      viewBox(
        input([8, 8], {
          childAt: () => {
            calls++;
            return { width: 8, height: 1 };
          },
        }),
      ),
    geometry,
  );
  assert.equal(calls, 2);
  for (const width of [NaN, Infinity, -1])
    assert.throws(() => viewBox(input([1], { childAt: () => ({ width, height: 1 }) })), LayoutInputError);
  const child = Object.defineProperty({ height: 1 }, "width", {
    get() {
      throw new Error("getter executed");
    },
  });
  assert.throws(
    () => viewBox(input([1], { childAt: () => child as { width: number; height: number } })),
    LayoutInputError,
  );
});
