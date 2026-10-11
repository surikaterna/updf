import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { type BoxStyle, type BoxView, layoutBoxes } from "@updf/layout-boxes/boxes";

interface Node {
  id: string;
  style?: BoxStyle;
  children?: Node[];
  content?: object;
}
const view: BoxView<Node, object> = {
  id: (node) => node.id,
  path: (node) => `/${node.id}`,
  style: (node) => node.style ?? {},
  childCount: (node) => node.children?.length ?? 0,
  childAt: (node, index) => node.children?.[index] as Node,
  content: (node) => node.content,
};
const geometry = (error: unknown) => error instanceof LayoutInputError && error.code === "GEOMETRY";

test("measured leaves reject native endpoint overflow for automatic, explicit and clamped heights", () => {
  for (const [paddingTop, paddingBottom, height] of [
    [0, 0.2, 0.7],
    [0.4, 0.3, 1.2],
  ] as const) {
    assert.ok(paddingTop + 0.5 > height - paddingBottom);
    for (const constraint of [{}, { height }, { maxHeight: height }]) {
      const style = { paddingTop, paddingBottom, ...constraint };
      for (const nested of [false, true]) {
        const leaf: Node = { id: "leaf", style, content: {} };
        const root = nested ? { id: "root", children: [{ id: "inner", children: [leaf] }] } : leaf;
        let calls = 0;
        assert.throws(
          () => layoutBoxes({ root, view, width: 80, measure: () => ({ height: (++calls, 0.5) }) }),
          geometry,
        );
        assert.equal(calls, 1);
        const childGeometry: Node = { id: "equivalent", style, children: [{ id: "child", style: { height: 0.5 } }] };
        assert.throws(() => layoutBoxes({ root: childGeometry, view, width: 80 }), geometry);
      }
    }
  }
});

test("final stretch allocation fits retained measured extent without remeasurement", () => {
  const root: Node = {
    id: "root",
    style: { flexDirection: "row", alignItems: "stretch", height: 2 },
    children: [{ id: "leaf", style: { paddingTop: 0.4, paddingBottom: 0.3 }, content: {} }],
  };
  let calls = 0;
  const result = layoutBoxes({ root, view, width: 80, measure: () => ({ height: (++calls, 0.5) }) });
  assert.equal(result.boxes[1]?.height, 2);
  assert.equal(calls, 1);
  assert.deepEqual(result.counts, { nodes: 2, childCalls: 1, measurements: 1 });
});

test("measured leaf bounds accept genuine native fits and reject actual truncation", () => {
  for (const style of [
    { paddingTop: 0.25, paddingBottom: 0.25 },
    { paddingTop: 0.4 },
    { paddingBottom: 0.2, height: 0.75 },
    { paddingTop: 0.4, paddingBottom: 0.3, minHeight: 1.25 },
  ]) {
    const result = layoutBoxes({
      root: { id: "leaf", style, content: {} },
      view,
      width: 80,
      measure: () => ({ height: 0.5 }),
    });
    assert.ok((style.paddingTop ?? 0) + 0.5 <= (result.boxes[0]?.height ?? 0) - (style.paddingBottom ?? 0));
    assert.equal(result.counts.measurements, 1);
  }
  assert.throws(
    () =>
      layoutBoxes({
        root: { id: "leaf", style: { height: 0.49 }, content: {} },
        view,
        width: 80,
        measure: () => ({ height: 0.5 }),
      }),
    geometry,
  );
});
