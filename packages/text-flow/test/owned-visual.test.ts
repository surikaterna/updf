import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render, type NodeDefinition } from "@updf/core";
import { createOperationCapability, defineOperationExtension } from "@updf/core/internal";
import { h, type VNode } from "@updf/core/vdom";
import { jsx } from "@updf/core/jsx-runtime";
import { Block, Document, Flow, fixed, layout, measure, type BlockStyle } from "@updf/layout";
import { floatable, textFlow } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
import { nativeRect, testVisual } from "../../layout/test/visual-fixture.js";

const document = (children: VNode | readonly VNode[]) =>
  h(Document, {
    children: h(Flow, {
      pageSize: { width: 100, height: 100 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children,
    }),
  });
const install = (set: object) =>
  defineOperationExtension(
    {},
    createOperationCapability(() => () => ({})),
    set,
  );
function withoutIdentityGroups(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return nodes.flatMap((node) => {
    if (node.type !== "paintGroup") return [node];
    const children = withoutIdentityGroups(node.children);
    if (!node.clip && JSON.stringify(node.transform) === "[1,0,0,1,0,0]") return children;
    return [{ ...node, children }];
  });
}
test("ordinary owned visual needs only its paired central set, measures once and uses Block sizing", () => {
  let calls = 0;
  let captures = 0;
  const visual = testVisual(
    "test.once",
    () => calls++,
    () => captures++,
  );
  const child = h(visual.Component, {
    tone: "blue",
    style: {
      width: 30,
      height: 20,
      padding: 2,
      border: { width: 1, color: [1, 0, 0] },
      backgroundColor: [0, 1, 0],
    },
  });
  const options = { extensions: [install(visual.adapters)] };
  const result = layout(document(child), options);
  assert.equal(calls, 1);
  assert.equal(captures, 1);
  assert.equal(result.placements[0]!.box.height, 20);
  assert.equal(result.placements[0]!.box.width, 30);
  assert.ok(render(result.document).length > 100);
  assert.equal(measure(child, { width: 100 }, options).size.height, 20);
  assert.equal(measure(child, { width: 100 }, options).size.width, 30);
});
test("ordinary and floated owned visuals match the canonical Block's native coordinates and ink", () => {
  const visual = testVisual("test.parity");
  const Floating = floatable(visual.Component);
  const options = { extensions: [textFlow(), install(visual.adapters)] };
  const styles: BlockStyle[] = [
    { width: 30, height: 20, padding: 2, border: { width: 1, color: [1, 0, 0] }, backgroundColor: [0, 1, 0] },
    { width: 30, minWidth: 32, maxWidth: 40, minHeight: 20, maxHeight: 24, padding: 2 },
    { width: 30, height: 2, overflow: "hidden" },
  ];
  for (const style of styles) {
    const width = style.minWidth ?? style.width!;
    const inset = style.border ? 3 : (style.padding ?? 0);
    const plain = h(Block, { style, children: fixed({ height: 4, children: [nativeRect(width - inset * 2)] }) });
    const ordinary = h(visual.Component, { tone: "blue", style });
    assert.deepEqual(measure(ordinary, { width: 100 }, options), measure(plain, { width: 100 }));
    const ordinaryLayout = layout(document(ordinary), options);
    assert.deepEqual(
      withoutIdentityGroups(ordinaryLayout.document.pages[0]!.children),
      withoutIdentityGroups(layout(document(plain)).document.pages[0]!.children),
    );
    if (style.height === undefined || style.overflow === "hidden") continue;
    const floated = h(Floating, {
      tone: "blue" as const,
      style: { ...style, width, height: style.height, float: "left" as const },
    });
    const floatingLayout = layout(document(floated), options);
    assert.deepEqual(
      withoutIdentityGroups(floatingLayout.document.pages[0]!.children),
      withoutIdentityGroups(ordinaryLayout.document.pages[0]!.children),
    );
  }
});
test("owned visuals reject automatic margins at the authored field, without changing ordinary Block", () => {
  const visual = testVisual();
  const child = h(visual.Component, { tone: "blue", style: { width: 30, height: 20, marginTop: "auto" } });
  assert.throws(
    () => layout(document(child), { extensions: [install(visual.adapters)] }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]!.path, "/document/children/children/style/marginTop");
      return true;
    },
  );
  assert.doesNotThrow(() =>
    layout(document(h(Block, { children: null, keepTogether: true, style: { height: 20, marginTop: "auto" } }))),
  );
});
test("floating marker fields reject accessors and inherited metadata without invoking getters", () => {
  const visual = testVisual();
  const Floating = floatable(visual.Component);
  let calls = 0;
  const accessor = Object.defineProperty({ width: 30, height: 20 }, "float", {
    enumerable: true,
    get() {
      calls++;
      return "left";
    },
  });
  const inherited = Object.assign(Object.create({ float: "left" }), { width: 30, height: 20 });
  for (const style of [accessor, inherited])
    assert.throws(
      () =>
        layout(document(h(Floating, { tone: "blue", style })), { extensions: [textFlow(), install(visual.adapters)] }),
      DocumentError,
    );
  assert.equal(calls, 0);
});
test("ordinary owned visuals preserve canonical Block overflow rejection", () => {
  const visual = testVisual();
  assert.throws(
    () =>
      measure(
        h(visual.Component, { tone: "blue", style: { width: 30, height: 2 } }),
        { width: 100 },
        { extensions: [install(visual.adapters)] },
      ),
    DocumentError,
  );
});
test("ordinary Path, ordinary visual and floating visual coexist under the existing participation owner", () => {
  const visual = testVisual();
  const Floating = floatable(visual.Component);
  assert.equal(floatable(visual.Component), Floating);
  const result = layout(
    document([
      jsx(Path, { d: "M0 0h10v10h-10z", fill: "#000", style: { width: 10, height: 10 } }, "path"),
      jsx(visual.Component, { tone: "blue", style: { width: 10, height: 10 } }, "ordinary"),
      jsx(Floating, { tone: "blue", style: { width: 10, height: 10, float: "left" } }, "floating"),
    ]),
    { extensions: [textFlow({ handlers: [pathShapes()] }), install(visual.adapters)] },
  );
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 100);
  assert.ok(result.placements.some((p) => p.sourceKeys?.includes("floating")));
});
test("missing visual installation and forged components reject; strict capture keeps original field paths", () => {
  const visual = testVisual();
  const Floating = floatable(visual.Component);
  assert.throws(() => floatable((() => null) as never), DocumentError);
  for (const Component of [visual.Component, Floating]) {
    const style = Component === Floating ? { width: 10, height: 10, float: "left" } : { width: 10, height: 10 };
    assert.throws(
      () =>
        layout(document(jsx(Component, { tone: "blue", style } as never)), {
          extensions: [textFlow()],
        }),
      DocumentError,
    );
    assert.throws(
      () =>
        layout(document(jsx(Component, { tone: "red", style } as never)), {
          extensions: [textFlow(), install(visual.adapters)],
        }),
      (error: unknown) => {
        assert.ok(error instanceof DocumentError);
        assert.equal(error.diagnostics[0]!.path, "/document/children/children/tone");
        return true;
      },
    );
  }
  assert.throws(
    () =>
      layout(document(h(Block, { children: jsx(visual.Component, { tone: "blue", extra: 1 } as never) })), {
        extensions: [install(visual.adapters)],
      }),
    DocumentError,
  );
});
