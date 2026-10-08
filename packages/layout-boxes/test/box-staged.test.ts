import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import {
  allocateBoxLayout,
  finishBoxLayout,
  layoutBoxes,
  type BoxStyle,
  type BoxView,
  type BoxLayoutPlan,
  type BoxMeasurementResult,
} from "@updf/layout-boxes/boxes";
import { bits, dyadic } from "@updf/layout-boxes/numeric";

interface Node {
  id: string;
  style?: BoxStyle;
  children?: Node[];
  content?: object;
}
const view: BoxView<Node, object> = {
  id: (n) => n.id,
  path: (n) => `/${n.id}`,
  style: (n) => n.style ?? {},
  childCount: (n) => n.children?.length ?? 0,
  childAt: (n, i) => n.children![i]!,
  content: (n) => n.content,
};
const input = (root: Node) => ({ root, view, width: 80 });
const results = (plan: BoxLayoutPlan<object>, height = 3) => plan.requests.map((request) => ({ request, height }));
const code = (expected: string, path?: string) => (e: unknown) =>
  e instanceof LayoutInputError && e.code === expected && (path === undefined || e.path === path);

test("staged and synchronous passes agree across nested directions, bounds, insets and alignment", () => {
  for (const containment of ["native", "metric"] as const) {
    for (const alignItems of ["start", "center", "end", "stretch"] as const) {
      const root: Node = {
        id: "root",
        style: { gap: 2, paddingTop: 1, paddingBottom: 2 },
        children: [
          {
            id: "row",
            style: { flexDirection: "row", alignItems, height: 12, gap: 1, paddingLeft: 2, paddingRight: 3 },
            children: [
              { id: "one", style: { width: 20, paddingLeft: 1, paddingTop: 1 }, content: {} },
              {
                id: "inner",
                style: { flexDirection: "row", alignItems: "end", minWidth: 10, maxWidth: 50 },
                children: [{ id: "two", content: {} }],
              },
            ],
          },
          { id: "footer", style: { minHeight: 4, maxHeight: 8 }, content: {} },
        ],
      };
      const options = { ...input(root), containment, exactInlineEdges: true };
      const plan = allocateBoxLayout(options);
      assert.deepEqual(
        plan.requests.map((r) => r.path),
        ["/one", "/two", "/footer"],
      );
      assert.equal(plan.requests[0]?.allocation.width, 19);
      const expected = layoutBoxes({ ...options, measure: () => ({ height: 3 }) });
      assert.deepEqual(finishBoxLayout(plan, results(plan).reverse()), expected);
      assert.deepEqual(finishBoxLayout(plan, results(plan)), expected);
    }
  }
});
test("finish preserves containment roundoff policy and fresh sizes after stretch or failure", () => {
  const root: Node = {
    id: "row",
    style: { flexDirection: "row", height: 0.3, paddingTop: 0.1 },
    children: [{ id: "leaf", content: {} }],
  };
  const native = allocateBoxLayout(input(root));
  assert.throws(() => finishBoxLayout(native, results(native, 0.2)), code("GEOMETRY", "/row"));
  assert.equal(finishBoxLayout(native, results(native, 0.1)).boxes[1]?.height, 0.1);
  const options = { ...input(root), containment: "metric" as const };
  const metric = allocateBoxLayout(options);
  assert.deepEqual(
    finishBoxLayout(metric, results(metric, 0.2)),
    layoutBoxes({ ...options, measure: () => ({ height: 0.2 }) }),
  );
  root.style = { flexDirection: "row", alignItems: "stretch" };
  root.children!.push({ id: "other", content: {} });
  const plan = allocateBoxLayout(input(root));
  const unequal = results(plan);
  unequal[1]!.height = 10;
  assert.deepEqual(
    finishBoxLayout(plan, unequal).boxes.map((box) => box.height),
    [10, 10, 10],
  );
  assert.deepEqual(
    finishBoxLayout(plan, results(plan, 1)).boxes.map((box) => box.height),
    [1, 1, 1],
  );
});
test("allocation snapshots survive style/tree/options mutations without further view reads", () => {
  let reads = 0;
  const observed = {
    ...view,
    style: (n: Node) => {
      reads++;
      return view.style(n);
    },
  };
  const payload = { value: 1 },
    style = { paddingTop: 1 };
  const root: Node = { id: "root", style, children: [{ id: "leaf", content: payload }] };
  const options = { ...input(root), view: observed, containment: "metric" as const, limits: { measurements: 1 } };
  const plan = allocateBoxLayout(options);
  style.paddingTop = 99;
  root.children = [];
  options.width = 1;
  options.limits.measurements = 0;
  observed.style = () => {
    throw new Error("reread");
  };
  payload.value = 2;
  assert.ok(Object.isFrozen(plan) && Object.isFrozen(plan.requests));
  assert.ok(Object.isFrozen(plan.requests[0]) && Object.isFrozen(plan.requests[0]?.allocation));
  assert.equal(Object.isFrozen(payload), false);
  const output = finishBoxLayout(plan, results(plan));
  assert.equal(reads, 2);
  assert.equal(output.boxes[0]?.height, 4);
  assert.equal(output.boxes[1]?.content, payload);
  assert.equal(output.containment, "metric");
});
test("late allocation failures and measurement budgets precede all callbacks, even missing measure", () => {
  let calls = 0;
  const root: Node = {
    id: "root",
    children: [
      { id: "first", content: {} },
      { id: "late", style: { width: 81 }, content: {} },
    ],
  };
  const measure = () => {
    calls++;
    return { height: 0 };
  };
  assert.throws(() => layoutBoxes({ ...input(root), measure }), code("GEOMETRY"));
  assert.throws(() => layoutBoxes(input(root)), code("GEOMETRY"));
  root.children![1]!.style = {};
  assert.throws(() => layoutBoxes({ ...input(root), limits: { measurements: 1 }, measure }), code("LIMIT"));
  root.style = { flexDirection: "row", alignItems: "stretch" };
  root.children![1]!.style = { height: 5 };
  assert.throws(() => layoutBoxes({ ...input(root), measure }), code("VALUE"));
  root.children![1]!.style = { paddingLeft: 80 };
  assert.throws(() => layoutBoxes({ ...input(root), measure }), code("GEOMETRY"));
  assert.equal(calls, 0);
});
test("finish requires exact complete issued identities, accepts zero/shuffled results and retries", () => {
  const root: Node = {
    id: "root",
    children: [
      { id: "one", content: {} },
      { id: "two", content: {} },
    ],
  };
  const plan = allocateBoxLayout(input(root)),
    good = results(plan, 0);
  const foreign = allocateBoxLayout(input(root));
  for (const bad of [
    [],
    [good[0]!],
    [good[0]!, good[0]!],
    results(foreign),
    [{ request: { ...plan.requests[0]! }, height: 0 }, good[1]!],
  ]) {
    assert.throws(() => finishBoxLayout(plan, bad), code("VALUE"));
  }
  assert.throws(() => finishBoxLayout({ ...plan }, good), code("VALUE", "/boxes/plan"));
  assert.deepEqual(finishBoxLayout(plan, good.reverse()), finishBoxLayout(plan, good));
  assert.equal(finishBoxLayout(plan, good).boxes[0]?.height, 0);
  const empty = allocateBoxLayout(input({ id: "empty" }));
  assert.equal(finishBoxLayout(empty, []).counts.measurements, 0);
});
test("malformed finish data rejects safely with indexed diagnostics and does not poison plans", () => {
  let getters = 0;
  const plan = allocateBoxLayout(input({ id: "leaf", style: { height: 4, paddingTop: 1 }, content: {} }));
  const request = plan.requests[0]!;
  const badFinish = (value: unknown) => finishBoxLayout(plan, value as readonly BoxMeasurementResult<object>[]);
  for (const bad of [
    null,
    {},
    [null],
    [{ request }],
    [{ request, height: "3" }],
    [
      Object.defineProperty({ request }, "height", {
        enumerable: true,
        get: () => {
          getters++;
          return 3;
        },
      }),
    ],
    Object.defineProperty([], "0", {
      enumerable: true,
      get: () => {
        getters++;
        return {};
      },
    }),
  ]) {
    assert.throws(() => badFinish(bad), code("TYPE"));
  }
  for (const height of [-1, Infinity, NaN])
    assert.throws(() => badFinish([{ request, height }]), code("GEOMETRY", "/boxes/results/0/height"));
  assert.throws(() => badFinish([{ request, height: 4 }]), code("GEOMETRY", "/leaf"));
  assert.equal(getters, 0);
  assert.equal(finishBoxLayout(plan, [{ request, height: 3 }]).boxes[0]?.height, 4);
});
test("staged input never accepts measure, including undefined/accessors", () => {
  let getters = 0;
  for (const value of [undefined, () => ({ height: 0 })]) {
    assert.throws(() => allocateBoxLayout({ ...input({ id: "root" }), measure: value } as never), LayoutInputError);
  }
  const options = Object.defineProperty(input({ id: "root" }), "measure", {
    enumerable: true,
    get: () => {
      getters++;
      return undefined;
    },
  });
  assert.throws(() => allocateBoxLayout(options), LayoutInputError);
  assert.equal(getters, 0);
});
test("request edges preserve exact dyadic insets and fractional row carry", () => {
  const root: Node = {
    id: "root",
    style: { flexDirection: "row", gap: 0.1, paddingLeft: 0.2 },
    children: [
      { id: "one", style: { width: 1.9 }, content: {} },
      { id: "two", style: { width: 2.1, paddingLeft: 0.3 }, content: {} },
    ],
  };
  const plan = allocateBoxLayout({ ...input(root), exactInlineEdges: true });
  const a = plan.requests[1]!.allocation;
  assert.equal(
    a.exactStart,
    [0.2, 1.9, 0.1, 0.3].reduce((n, v) => n + dyadic(bits(v)), 0n),
  );
  assert.equal(a.exactEnd, a.exactStart! + dyadic(bits(a.width)));
  assert.equal("exactStart" in allocateBoxLayout(input(root)).requests[0]!.allocation, false);
});
test("staged deep trees finish iteratively and reject traversal limits", () => {
  const root: Node = { id: "0" };
  let tail = root;
  for (let i = 1; i < 3000; i++) {
    const child = { id: String(i) };
    tail.children = [child];
    tail = child;
  }
  tail.content = {};
  assert.throws(() => allocateBoxLayout(input(root)), code("LIMIT"));
  for (const limits of [{ nodes: 2 }, { childCalls: 1 }, { measurements: 0, depth: 3000 }]) {
    assert.throws(() => allocateBoxLayout({ ...input(root), limits }), code("LIMIT"));
  }
  const plan = allocateBoxLayout({ ...input(root), limits: { depth: 3000 } });
  assert.equal(finishBoxLayout(plan, results(plan)).boxes.length, 3000);
});
test("synchronous invalid response stops subsequent callbacks and exceptions retain identity", () => {
  const root: Node = {
    id: "root",
    children: [
      { id: "one", content: {} },
      { id: "two", content: {} },
    ],
  };
  let calls = 0;
  assert.throws(
    () =>
      layoutBoxes({
        ...input(root),
        measure: () => {
          calls++;
          return { height: -1 };
        },
      }),
    code("GEOMETRY", "/one/height"),
  );
  assert.equal(calls, 1);
  const sentinel = new Error("host");
  assert.throws(
    () =>
      layoutBoxes({
        ...input(root),
        measure: () => {
          throw sentinel;
        },
      }),
    (e) => e === sentinel,
  );
});
