import assert from "node:assert/strict";
import { test } from "node:test";
import { LayoutInputError } from "@updf/layout-boxes";
import {
  allocateBoxLayout,
  finishBoxLayout,
  layoutBoxes,
  type BoxStyle,
  type BoxView,
  type BoxContainment,
} from "@updf/layout-boxes/boxes";

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
  childAt: (node, i) => node.children![i]!,
  content: (node) => node.content,
};
const leaf = (style: BoxStyle = {}, content = 30): Node => ({ id: "leaf", style, content });
const error = (code: string, path?: string) => (value: unknown) =>
  value instanceof LayoutInputError && value.code === code && (path === undefined || value.path === path);
const options = (root: Node, containment: BoxContainment) => ({ root, view, width: 80, containment });
function run(root: Node, containment: BoxContainment, staged: boolean) {
  const input = options(root, containment);
  if (!staged) return layoutBoxes({ ...input, measure: (content) => ({ height: content }) });
  const plan = allocateBoxLayout(input);
  return finishBoxLayout(
    plan,
    plan.requests.map((request) => ({ request, height: request.content })),
  );
}

for (const containment of ["native", "metric"] as const) {
  for (const staged of [false, true]) {
    const mode = `${containment}/${staged ? "staged" : "sync"}`;
    test(`${mode}: clipping resolves authored bounds without truncating measurement`, () => {
      const insets = { paddingTop: 2, paddingBottom: 3 };
      for (const overflow of [undefined, "error"] as const) {
        const style = { ...insets, height: 15, ...(overflow === undefined ? {} : { overflow }) };
        assert.throws(() => run(leaf(style), containment, staged), error("GEOMETRY", "/leaf"));
      }
      for (const [constraints, expected] of [
        [{ height: 15 }, 15],
        [{ maxHeight: 15 }, 15],
        [{ height: 10, minHeight: 15 }, 15],
        [{ height: 40, maxHeight: 15 }, 15],
        [{ minHeight: 40 }, 40],
        [{ height: 40, minHeight: 10, maxHeight: 15 }, 15],
        [{}, 35],
      ] as const) {
        const output = run(leaf({ ...insets, ...constraints, overflow: "clip" }), containment, staged);
        assert.equal(output.boxes[0]?.height, expected);
        assert.equal(output.boxes[0]?.content, 30);
        assert.equal(output.counts.measurements, 1);
        assert.equal(output.boxes[0]?.allocation.width, 80);
      }
      assert.equal(run(leaf({ overflow: "clip", ...insets }, 0), containment, staged).boxes[0]?.height, 5);
      assert.equal(run(leaf({ overflow: "clip" }, 0), containment, staged).boxes[0]?.height, 0);
    });
    test(`${mode}: reservation floor is strict, including zero body and metric near-boundary`, () => {
      for (const content of [0, 30]) {
        for (const height of [4, 5 - Number.EPSILON * 4]) {
          assert.throws(
            () =>
              run(leaf({ overflow: "clip", paddingTop: 2, paddingBottom: 3, height }, content), containment, staged),
            error("GEOMETRY", "/leaf"),
          );
        }
        assert.equal(
          run(leaf({ overflow: "clip", paddingTop: 2, paddingBottom: 3, height: 5 }, content), containment, staged)
            .boxes[0]?.height,
          5,
        );
      }
      assert.throws(
        () => run(leaf({ paddingTop: 2, paddingBottom: 3, height: 5 - Number.EPSILON * 4 }, 0), containment, staged),
        error("GEOMETRY"),
      );
    });
    test(`${mode}: clip does not bypass finite domains, intermediates or contradictory bounds`, () => {
      for (const content of [NaN, Infinity, -Infinity, -1]) {
        assert.throws(
          () => run(leaf({ overflow: "clip", height: 15 }, content), containment, staged),
          error("GEOMETRY"),
        );
      }
      for (const style of [
        { height: Infinity },
        { height: -1 },
        { minHeight: 20, maxHeight: 15 },
        { paddingTop: Number.MAX_VALUE, paddingBottom: Number.MAX_VALUE },
        { paddingTop: Number.MAX_VALUE, height: 15 },
      ]) {
        assert.throws(
          () => run(leaf({ ...style, overflow: "clip" }, Number.MAX_VALUE), containment, staged),
          error("GEOMETRY"),
        );
      }
    });
    test(`${mode}: parent containment still rejects genuine overflow`, () => {
      const root: Node = {
        id: "parent",
        style: { height: 14, overflow: "error" },
        children: [leaf({ overflow: "clip", height: 15 })],
      };
      assert.throws(() => run(root, containment, staged), error("GEOMETRY", "/parent"));
      root.style = { height: 15, overflow: "error" };
      assert.deepEqual(
        run(root, containment, staged).boxes.map((box) => box.height),
        [15, 15],
      );
      root.style = { width: 40 };
      root.children![0]!.style = { overflow: "clip", height: 15, width: 41 };
      assert.throws(() => run(root, containment, staged), error("GEOMETRY", "/leaf"));
    });
  }
  test(`${containment}: structural/contentless and malformed overflow reject before measurement`, () => {
    let calls = 0;
    const invalid: Node[] = [
      { id: "empty", style: { overflow: "clip" } },
      { id: "parent", style: { overflow: "clip" }, children: [leaf()] },
      ...[undefined, "hidden", "visible", null, 0].map((overflow) => leaf({ overflow } as never)),
    ];
    for (const root of invalid) {
      assert.throws(() => allocateBoxLayout(options(root, containment)), LayoutInputError);
      assert.throws(
        () =>
          layoutBoxes({
            ...options(root, containment),
            measure: () => {
              calls++;
              return { height: 30 };
            },
          }),
        LayoutInputError,
      );
    }
    assert.equal(calls, 0);
    const root: Node = { id: "parent", children: [leaf(), invalid[0]!] };
    assert.throws(
      () =>
        layoutBoxes({
          ...options(root, containment),
          measure: () => {
            calls++;
            return { height: 30 };
          },
        }),
      error("VALUE", "/empty/style/overflow"),
    );
    assert.equal(calls, 0);
    assert.equal(run({ id: "empty", style: { overflow: "error" } }, containment, false).boxes[0]?.height, 0);
  });
  test(`${containment}: stretch measures once and preserves height constraint preflight`, () => {
    const root: Node = {
      id: "row",
      style: { flexDirection: "row", alignItems: "stretch", height: 50 },
      children: [leaf({ overflow: "clip", paddingTop: 2, paddingBottom: 3 })],
    };
    let calls = 0;
    const sync = layoutBoxes({
      ...options(root, containment),
      measure: (content) => {
        calls++;
        return { height: content };
      },
    });
    assert.equal(calls, 1);
    assert.deepEqual(
      sync.boxes.map((box) => box.height),
      [50, 50],
    );
    assert.deepEqual(run(root, containment, true), sync);
    for (const constraints of [{ height: 15 }, { minHeight: 15 }, { maxHeight: 15 }]) {
      root.children![0]!.style = { overflow: "clip", ...constraints };
      assert.throws(() => allocateBoxLayout(options(root, containment)), error("VALUE", "/leaf"));
      assert.throws(
        () =>
          layoutBoxes({
            ...options(root, containment),
            measure: () => {
              calls++;
              return { height: 30 };
            },
          }),
        error("VALUE", "/leaf"),
      );
    }
    assert.equal(calls, 1);
  });
  test(`${containment}: failed finishes are reusable and full natural intermediates remain validated`, () => {
    const plan = allocateBoxLayout(
      options(leaf({ overflow: "clip", height: 15, paddingTop: 2, paddingBottom: 3 }), containment),
    );
    const request = plan.requests[0]!;
    assert.throws(() => finishBoxLayout(plan, [{ request, height: NaN }]), error("GEOMETRY"));
    assert.equal(finishBoxLayout(plan, [{ request, height: Number.MAX_VALUE }]).boxes[0]?.height, 15);
    const good = [{ request, height: 30 }];
    assert.deepEqual(finishBoxLayout(plan, good), finishBoxLayout(plan, good));
    const huge = allocateBoxLayout(
      options(leaf({ overflow: "clip", height: Number.MAX_VALUE, paddingTop: Number.MAX_VALUE }), containment),
    );
    assert.throws(
      () => finishBoxLayout(huge, [{ request: huge.requests[0]!, height: Number.MAX_VALUE }]),
      error("GEOMETRY"),
    );
    assert.equal(finishBoxLayout(huge, [{ request: huge.requests[0]!, height: 0 }]).boxes[0]?.height, Number.MAX_VALUE);
  });
}

test("clip bypasses measured-body endpoint fit without changing native/metric error behavior", () => {
  const clipped = leaf({ overflow: "clip", height: 0.3, paddingTop: 0.1 }, 0.2);
  for (const staged of [false, true]) {
    assert.equal(run(clipped, "native", staged).boxes[0]?.height, 0.3);
    assert.equal(run(clipped, "metric", staged).boxes[0]?.height, 0.3);
    const strict = leaf({ height: 0.3, paddingTop: 0.1 }, 0.2);
    assert.throws(() => run(strict, "native", staged), error("GEOMETRY"));
    assert.equal(run(strict, "metric", staged).boxes[0]?.height, 0.3);
  }
});
