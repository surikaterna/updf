import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-kernel";
import { type BoxLimits, type BoxStyle, type BoxView, layoutBoxes, viewBox } from "@updf/layout-kernel/boxes";
import { bits, dyadic } from "@updf/layout-kernel/numeric";
import { assertArithmeticPreserved } from "./arithmetic-source-certificate.js";

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
  childAt: (node, i) => node.children?.[i] as Node,
  content: (node) => node.content,
};
const measured = () => ({ height: 3 });
const run = (root: Node) => layoutBoxes({ root, view, width: 80, measure: measured });
const code = (expected: string) => (error: unknown) => error instanceof LayoutInputError && error.code === expected;

test("boxes compose preorder references, indexed children, row max and column stack with reserved insets", () => {
  const root: Node = {
    id: "root",
    style: { gap: 2, paddingTop: 1, paddingBottom: 2 },
    children: [
      {
        id: "row",
        style: { flexDirection: "row", gap: 1, paddingLeft: 2, paddingRight: 3 },
        children: [
          { id: "one", style: { width: 20 }, content: {} },
          { id: "two", style: { flexGrow: 2, flexBasis: 0, height: 5 }, content: {} },
        ],
      },
      { id: "footer", content: {} },
    ],
  };
  const result = run(root);
  assert.deepEqual(
    result.boxes.map((box) => [box.id, box.left, box.top, box.width, box.height]),
    [
      ["root", 0, 0, 80, 13],
      ["row", 0, 0, 80, 5],
      ["one", 0, 0, 20, 3],
      ["two", 21, 0, 54, 5],
      ["footer", 0, 7, 80, 3],
    ],
  );
  assert.deepEqual(result.childIndices, [1, 4, 2, 3]);
  assert.deepEqual(result.counts, { nodes: 5, childCalls: 4, measurements: 3 });
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.boxes) && Object.isFrozen(result.boxes[2]?.allocation));
});
test("empty boxes do not need measure and opaque content is not frozen", () => {
  assert.equal(layoutBoxes({ root: { id: "empty" }, view, width: 20 }).boxes[0]?.height, 0);
  const content = { mutable: true },
    root: Node = { id: "leaf", content };
  const result = run(root);
  assert.equal(result.boxes[0]?.content, content);
  assert.equal(Object.isFrozen(root), false);
  assert.equal(Object.isFrozen(content), false);
  assert.throws(() => layoutBoxes({ root, view, width: 20 }), code("TYPE"));
});
test("source fields read once, reusable style snapshots survive caller mutation", () => {
  const calls = new Map<string, number>(),
    shared = { paddingTop: 1 };
  const observed = Object.fromEntries(
    Object.entries(view).map(([key, callback]) => [
      key,
      (node: Node, index?: number) => {
        const id = `${node.id}:${key}`;
        calls.set(id, (calls.get(id) ?? 0) + 1);
        return callback(node, index as number);
      },
    ]),
  ) as unknown as BoxView<Node, object>;
  const root: Node = { id: "root", style: shared, children: [{ id: "leaf", style: shared, content: {} }] };
  const result = layoutBoxes({
    root,
    view: observed,
    width: 20,
    measure: () => {
      shared.paddingTop = 99;
      return { height: 3 };
    },
  });
  assert.equal(result.boxes[0]?.height, 5);
  assert.ok([...calls.values()].every((count) => count === 1));
  const frozen = Object.freeze({ paddingTop: 1 });
  assert.equal(run({ id: "frozen", style: frozen }).boxes[0]?.height, 1);
  assert.equal(run({ id: "again", style: frozen }).boxes[0]?.height, 1);
});
test("row alignment and stretch use final height without remeasurement, including nested aligned rows", () => {
  for (const [alignItems, top, height] of [
    ["start", 0, 3],
    ["center", 3.5, 3],
    ["end", 7, 3],
    ["stretch", 0, 10],
  ] as const) {
    const result = run({
      id: "root",
      style: { flexDirection: "row", alignItems, height: 13, paddingTop: 1, paddingBottom: 2 },
      children: [{ id: "leaf", content: {} }],
    });
    assert.equal(result.boxes[1]?.top, top);
    assert.equal(result.boxes[1]?.height, height);
    assert.equal(result.counts.measurements, 1);
  }
  const result = run({
    id: "root",
    style: { flexDirection: "row", alignItems: "stretch", height: 20 },
    children: [
      { id: "inner", style: { flexDirection: "row", alignItems: "end" }, children: [{ id: "leaf", content: {} }] },
    ],
  });
  assert.equal(result.boxes[2]?.top, 17);
  assert.throws(
    () =>
      run({
        id: "root",
        style: { flexDirection: "row", alignItems: "stretch" },
        children: [{ id: "child", style: { height: 2 } }],
      }),
    code("VALUE"),
  );
});
test("exact allocation edges retain dyadic fractional carry and are absent by default", () => {
  const root: Node = {
    id: "root",
    style: { flexDirection: "row", gap: 0.1 } as const,
    children: [
      { id: "one", style: { width: 1.9 } },
      { id: "two", style: { width: 2.1 } },
    ],
  };
  const layout = layoutBoxes({ root, view, width: 10, exactInlineEdges: true });
  assert.equal(layout.boxes[2]?.allocation.exactStart, dyadic(bits(1.9)) + dyadic(bits(0.1)));
  assert.equal("exactStart" in (run(root).boxes[1]?.allocation ?? {}), false);
});
test("invalid box styles, zero/negative geometry and true truncation reject without epsilon fitting", () => {
  for (const style of [
    { width: 0 },
    { flexGrow: 0 },
    { flexBasis: 1 },
    { width: 10, flexGrow: 1 },
    { flexDirection: "column", alignItems: "center" },
    { gap: -1 },
    { minHeight: 2, maxHeight: 1 },
    { shrink: 1 },
    { gap: undefined },
  ]) {
    assert.throws(() => run({ id: "bad", style: style as BoxStyle }), LayoutInputError);
  }
  assert.throws(() => run({ id: "root", style: { height: 3 - Number.EPSILON * 2 }, content: {} }), code("GEOMETRY"));
  assert.throws(() => run({ id: "root", children: [{ id: "grow", style: { flexGrow: 1 } }] }), code("VALUE"));
  assert.throws(() => run({ id: "root", content: {}, children: [{ id: "child" }] }), code("VALUE"));
});
test("callback results are own data records and getter rejection never invokes host code", () => {
  let reads = 0;
  const style = Object.defineProperty({}, "gap", {
    enumerable: true,
    get: () => {
      reads++;
      throw new Error("getter");
    },
  });
  assert.throws(() => run({ id: "root", style }), code("TYPE"));
  const height = Object.defineProperty({}, "height", {
    enumerable: true,
    get: () => {
      reads++;
      return 2;
    },
  });
  assert.throws(
    () =>
      layoutBoxes({ root: { id: "leaf", content: {} }, view, width: 20, measure: () => height as { height: number } }),
    code("TYPE"),
  );
  assert.equal(reads, 0);
  for (const height of [NaN, Infinity, -1, undefined])
    assert.throws(
      () =>
        layoutBoxes({
          root: { id: "leaf", content: {} },
          view,
          width: 20,
          measure: () => ({ height: height as number }),
        }),
      LayoutInputError,
    );
});
test("quotas stop callbacks before over-budget calls and arbitrary exceptions retain identity", () => {
  let childCalls = 0,
    measures = 0;
  const root: Node = { id: "root", children: [{ id: "leaf", content: {} }] };
  const observed = {
    ...view,
    childAt: () => {
      childCalls++;
      throw new Error("must not run");
    },
  };
  assert.throws(() => layoutBoxes({ root, view: observed, width: 20, limits: { childCalls: 0 } }), code("LIMIT"));
  assert.equal(childCalls, 0);
  assert.throws(
    () =>
      layoutBoxes({
        root,
        view,
        width: 20,
        limits: { measurements: 0 },
        measure: () => {
          measures++;
          return { height: 0 };
        },
      }),
    code("LIMIT"),
  );
  assert.equal(measures, 0);
});
test("trusted callback exceptions retain identity across view and measurement", () => {
  const root: Node = { id: "root" };
  const sentinel = new Error("host");
  assert.throws(
    () =>
      layoutBoxes({
        root,
        view: {
          ...view,
          style: () => {
            throw sentinel;
          },
        },
        width: 20,
      }),
    (error) => error === sentinel,
  );
  assert.throws(
    () =>
      layoutBoxes({
        root: { id: "leaf", content: {} },
        view,
        width: 20,
        measure: () => {
          throw sentinel;
        },
      }),
    (error) => error === sentinel,
  );
});
test("cycles, duplicate ids, depth and nodes are operation-local and deeply nested traversal is iterative", () => {
  const cycle: Node = { id: "cycle", children: [] };
  cycle.children?.push(cycle);
  assert.throws(() => run(cycle), code("VALUE"));
  assert.throws(() => run({ id: "root", children: [{ id: "repeat" }, { id: "repeat" }] }), code("VALUE"));
  const root: Node = { id: "0" };
  let tail = root;
  for (let i = 1; i < 3000; i++) {
    const child = { id: String(i) };
    tail.children = [child];
    tail = child;
  }
  assert.throws(() => run(root), code("LIMIT"));
  assert.throws(() => layoutBoxes({ root, view, width: 20, limits: { nodes: 2 } }), code("LIMIT"));
  assert.equal(layoutBoxes({ root, view, width: 20, limits: { depth: 3000 } }).boxes.length, 3000);
});
test("prepared source view and generic row share identical placements without resolving tracks twice", () => {
  const generic = run({
    id: "root",
    style: { flexDirection: "row", height: 10, alignItems: "end", gap: 1 },
    children: [
      { id: "one", style: { width: 20 }, content: {} },
      { id: "two", style: { width: 30 }, content: {} },
    ],
  });
  const prepared = viewBox({
    width: 80,
    height: 10,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    gap: 1,
    alignItems: "end",
    childCount: 2,
    childAt: (i) => ({ width: i === 0 ? 20 : 30, height: 3 }),
    path: "/prepared",
  });
  assert.deepEqual(
    prepared.children,
    generic.boxes.slice(1).map(({ left, top, width, height }) => ({ left, top, width, height })),
  );
});
test("arithmetic extraction preserves historical non-JSDoc bytes and executable output", async () => {
  const source = await readFile(new URL("../src/arithmetic.ts", import.meta.url), "utf8");
  assertArithmeticPreserved(source);
});
test("bad source callback metadata and invalid limits fail before unbounded work", () => {
  for (const change of [
    { id: () => "" },
    { id: () => 42 },
    { path: () => null },
    { childCount: () => 0.5 },
    { childCount: () => Number.MAX_SAFE_INTEGER + 1 },
    { style: () => [] },
  ]) {
    assert.throws(
      () =>
        layoutBoxes({
          root: { id: "root" },
          view: { ...view, ...change } as unknown as BoxView<Node, object>,
          width: 20,
        }),
      LayoutInputError,
    );
  }
  for (const limits of [
    { nodes: 0 },
    { depth: 0 },
    { childCalls: -1 },
    { measurements: 1.5 },
    { nodes: undefined },
    { unknown: 1 },
  ]) {
    assert.throws(
      () => layoutBoxes({ root: { id: "root" }, view, width: 20, limits: limits as BoxLimits }),
      LayoutInputError,
    );
  }
});
