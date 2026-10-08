import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import { allocateBoxLayout, finishBoxLayout, layoutBoxes, type BoxStyle, type BoxView } from "@updf/layout-boxes/boxes";

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
  childAt: (node, index) => node.children![index]!,
  content: (node) => node.content,
};
const input = (root: Node) => ({ root, view, width: 80 });
const code = (expected: string, path: string) => (error: unknown) =>
  error instanceof LayoutInputError && error.code === expected && error.path === path;

test("finish ignores proxy-supplied array iteration and rejects suppressed duplicate results with retry", () => {
  const plan = allocateBoxLayout(input({ id: "leaf", content: {} }));
  const result = { request: plan.requests[0]!, height: 3 };
  let iterations = 0;
  const duplicate = new Proxy([result, result], {
    get(target, key, receiver) {
      if (key === "forEach") {
        return (callback: (value: typeof result, index: number) => void) => {
          iterations++;
          callback(result, 0);
        };
      }
      return Reflect.get(target, key, receiver);
    },
  });
  assert.throws(() => finishBoxLayout(plan, duplicate), code("VALUE", "/boxes/results/1/request"));
  assert.equal(iterations, 0);
  assert.equal(finishBoxLayout(plan, [result]).boxes[0]?.height, 3);
});

test("finish snapshots later array entries before result proxy traps can replace them with accessors", () => {
  const root: Node = {
    id: "root",
    children: [
      { id: "one", content: {} },
      { id: "two", content: {} },
    ],
  };
  const plan = allocateBoxLayout(input(root));
  const good = plan.requests.map((request) => ({ request, height: 3 }));
  const supplied = [...good];
  let getters = 0;
  let mutations = 0;
  supplied[0] = new Proxy(good[0]!, {
    ownKeys(target) {
      mutations++;
      Object.defineProperty(supplied, "1", {
        enumerable: true,
        configurable: true,
        get: () => {
          getters++;
          return good[1];
        },
      });
      return Reflect.ownKeys(target);
    },
  });
  assert.deepEqual(finishBoxLayout(plan, supplied), finishBoxLayout(plan, good));
  assert.equal(mutations, 1);
  assert.equal(getters, 0);
  assert.throws(() => finishBoxLayout(plan, supplied), code("TYPE", "/boxes/results/1"));
  assert.equal(getters, 0);
  assert.equal(finishBoxLayout(plan, good).boxes[0]?.height, 6);
});

test("vertical inset overflow rejects during allocation at root or later sibling before measurement", () => {
  const style = { paddingTop: Number.MAX_VALUE, paddingBottom: Number.MAX_VALUE };
  const roots: Node[] = [
    { id: "bad", style, content: {} },
    {
      id: "root",
      children: [
        { id: "first", content: {} },
        { id: "bad", style, content: {} },
      ],
    },
  ];
  let calls = 0;
  const measure = () => {
    calls++;
    return { height: 0 };
  };
  for (const root of roots) {
    assert.throws(() => allocateBoxLayout(input(root)), code("GEOMETRY", "/bad"));
    assert.throws(() => layoutBoxes({ ...input(root), measure }), code("GEOMETRY", "/bad"));
    assert.throws(() => layoutBoxes(input(root)), code("GEOMETRY", "/bad"));
  }
  assert.equal(calls, 0);
});

test("finite vertical inset boundary remains allocatable and finishable", () => {
  const root: Node = {
    id: "leaf",
    style: { paddingTop: Number.MAX_VALUE / 2, paddingBottom: Number.MAX_VALUE / 2 },
    content: {},
  };
  const plan = allocateBoxLayout(input(root));
  const result = finishBoxLayout(plan, [{ request: plan.requests[0]!, height: 0 }]);
  assert.equal(result.boxes[0]?.height, Number.MAX_VALUE);
  assert.deepEqual(result, layoutBoxes({ ...input(root), measure: () => ({ height: 0 }) }));
});
