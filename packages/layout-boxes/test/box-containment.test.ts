import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { exceeds } from "@updf/layout-boxes/arithmetic";
import { type BoxContainment, type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-boxes/boxes";
import { bits, successor, value } from "@updf/layout-boxes/numeric";
import { boxContained } from "../src/box-containment.js";
import { LayoutInputError as InternalLayoutInputError } from "../src/error.js";

interface Node {
  id: string;
  style?: BoxStyle;
  children?: Node[];
  content?: number;
}
const view: BoxView<Node, number> = {
  id: (node) => node.id,
  path: (node) => `/${node.id}`,
  style: (node) => node.style ?? {},
  childCount: (node) => node.children?.length ?? 0,
  childAt: (node, index) => node.children?.[index] as Node,
  content: (node) => node.content,
};
const run = (root: Node, containment: BoxContainment = "metric") =>
  layoutBoxes({ root, view, width: 80, containment, measure: (height) => ({ height }) });
const geometry = (error: unknown) =>
  (error instanceof LayoutInputError || error instanceof InternalLayoutInputError) && error.code === "GEOMETRY";
const next = (n: number) => value(successor(bits(n)) as bigint);

test("metric row fit retains authored .3 height and .2 measured extent; native remains strict", () => {
  const root: Node = {
    id: "row",
    style: { flexDirection: "row", height: 0.3, paddingTop: 0.1 },
    children: [{ id: "leaf", style: { width: 20 }, content: 0.2 }],
  };
  assert.throws(() => run(root, "native"), geometry);
  const result = run(root);
  assert.equal(result.containment, "metric");
  assert.deepEqual(
    result.boxes.map(({ width, height, top }) => [width, height, top]),
    [
      [80, 0.3, 0],
      [20, 0.2, 0],
    ],
  );
  assert.deepEqual(result.counts, { nodes: 2, childCalls: 1, measurements: 1 });
});

test("measured leaves and nested row/column trees fit natural, fixed and maximum heights without snapping", () => {
  for (const constraint of [{}, { height: 0.3 }, { maxHeight: 0.3 }]) {
    const leaf: Node = { id: "leaf", style: { paddingTop: 0.1, ...constraint }, content: 0.2 };
    const expected = "height" in constraint || "maxHeight" in constraint ? 0.3 : 0.1 + 0.2;
    assert.equal(run(leaf).boxes[0]?.height, expected);
    for (const flexDirection of ["row", "column"] as const) {
      const root: Node = {
        id: "root",
        style: { flexDirection, paddingTop: 0.1, ...constraint },
        children: [{ id: "inner", children: [{ id: "child", content: 0.2 }] }],
      };
      const result = run(root);
      assert.equal(result.boxes[0]?.height, expected);
      assert.equal(result.boxes[2]?.height, 0.2);
      assert.equal(result.counts.measurements, 1);
    }
  }
});

test("shared accepted layouts retain geometry, identity, budgets and orthogonal exact inline metadata", () => {
  const root: Node = {
    id: "row",
    style: { flexDirection: "row", height: 10, alignItems: "stretch", gap: 0.1 },
    children: [
      { id: "a", style: { width: 1.9 }, content: 2 },
      { id: "b", style: { width: 2.1 }, content: 3 },
    ],
  };
  for (const exactInlineEdges of [false, true]) {
    const input = { root, view, width: 80, exactInlineEdges, measure: (height: number) => ({ height }) };
    const native = layoutBoxes(input);
    const metric = layoutBoxes({ ...input, containment: "metric" });
    assert.equal(native.containment, "native");
    assert.ok(Object.isFrozen(metric));
    assert.deepEqual(metric.boxes, native.boxes);
    assert.deepEqual(metric.childIndices, native.childIndices);
    assert.deepEqual(metric.counts, native.counts);
    assert.equal(metric.counts.measurements, 2);
    assert.equal(metric.boxes[1]?.height, 10);
  }
});

function assertMeasuredBounds(style: BoxStyle, height: number): void {
  for (const measured of [false, true]) {
    const leaf: Node = measured
      ? { id: "leaf", style, content: 0.5 }
      : { id: "leaf", style, children: [{ id: "child", style: { height: 0.5 } }] };
    for (const nested of [false, true]) {
      const root: Node = nested ? { id: "root", children: [{ id: "inner", children: [leaf] }] } : leaf;
      assert.throws(() => run(root, "native"), geometry);
      const result = run(root);
      assert.equal(result.boxes.find((box) => box.id === "leaf")?.height, height);
      assert.equal(result.counts.measurements, measured ? 1 : 0);
    }
  }
}
test("metric accepts the native measured-bounds regressions for leaves and equivalent child trees", () => {
  for (const [paddingTop, paddingBottom, height] of [
    [0, 0.2, 0.7],
    [0.4, 0.3, 1.2],
  ] as const) {
    for (const constraint of [{}, { height }, { maxHeight: height }])
      assertMeasuredBounds({ paddingTop, paddingBottom, ...constraint }, height);
  }
});

test("containment option is validated as own data without invoking accessors or callbacks", () => {
  let calls = 0;
  const input = { root: { id: "root" }, view, width: 80 };
  for (const containment of [undefined, null, "pdf", true])
    assert.throws(
      () => layoutBoxes({ ...input, containment } as unknown as Parameters<typeof layoutBoxes>[0]),
      LayoutInputError,
    );
  const accessor = Object.defineProperty({ ...input }, "containment", {
    enumerable: true,
    get: () => {
      calls++;
      return "metric";
    },
  });
  assert.throws(() => layoutBoxes(accessor), LayoutInputError);
  assert.throws(() => layoutBoxes(Object.assign(Object.create({ containment: "metric" }), input)), LayoutInputError);
  assert.equal(calls, 0);
});

test("natural overrun beyond allowance, invalid domains and nonfinite intermediates never fit", () => {
  let beyond = 0.3;
  while (!exceeds(beyond, 0.3)) beyond = next(beyond);
  assert.throws(() => run({ id: "leaf", style: { maxHeight: 0.3 }, content: beyond }), geometry);
  for (const content of [-Number.MIN_VALUE, NaN, Infinity, -Infinity])
    assert.throws(() => run({ id: "leaf", content }), geometry);
  assert.throws(() => run({ id: "root", style: { minHeight: next(0.3), maxHeight: 0.3 } }), LayoutInputError);
  assert.throws(
    () => run({ id: "leaf", style: { paddingTop: Number.MAX_VALUE, maxHeight: 1 }, content: Number.MAX_VALUE }),
    geometry,
  );
});

test("both local endpoints accept only their actual same-axis bounded allowance", () => {
  assert.equal(boxContained("metric", 0, 0, next(0.3), 0.3, 0, "/test"), true);
  assert.equal(boxContained("native", 0, 0, next(0.3), 0.3, 0, "/test"), false);
  let upper = 0.3;
  while (!exceeds(upper, 0.3)) upper = next(upper);
  assert.equal(boxContained("metric", 0, 0, upper, 0.3, 0, "/test"), false);
  const near = next(1) - 1;
  assert.equal(boxContained("metric", 1, -near, 0, 2, 0, "/test"), true);
  let lower = 1;
  while (!exceeds(lower, 1, lower - 1)) lower = next(lower);
  assert.equal(boxContained("metric", lower, 1 - lower, 0, 2, 0, "/test"), false);
});

test("cancellation scales use immediate operands, not a unit floor; nonfinite axes reject separately", () => {
  const residual = next(1) - 1;
  assert.equal(boxContained("metric", 0, 0, residual, 1, 1, "/test"), true);
  assert.equal(boxContained("native", 0, 0, residual, 1, 1, "/test"), false);
  assert.equal(boxContained("metric", 0, 0, next(1e-300), 1e-300, 0, "/test"), true);
  assert.equal(boxContained("metric", 0, 0, 1e-300, 0, 0, "/test"), false);
  assert.equal(boxContained("metric", 0, 0, Number.MIN_VALUE, 0, 0, "/test"), false);
  assert.equal(boxContained("metric", 0, 0, 1e-15, 1e-300, 0, "/test"), false);
  for (const invalid of [NaN, Infinity, -Infinity]) {
    for (let index = 0; index < 5; index++) {
      const operands = [0, 0, 1, 2, 0];
      operands[index] = invalid;
      assert.throws(
        () =>
          boxContained(
            "metric",
            operands[0] as number,
            operands[1] as number,
            operands[2] as number,
            operands[3] as number,
            operands[4] as number,
            "/test",
          ),
        geometry,
      );
    }
  }
  assert.throws(
    () => boxContained("metric", Number.MAX_VALUE, Number.MAX_VALUE, 0, Number.MAX_VALUE, 0, "/test"),
    geometry,
  );
});
