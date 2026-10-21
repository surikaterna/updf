import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, type NodeDefinition } from "@updf/core";
import { h, useContext } from "@updf/core/vdom";
import {
  Block,
  type BlockAdapter,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  fixed,
  flow,
  nativeInline,
  FragmentContext,
  PageContext,
  type FragmentInfo,
  type PageInfo,
} from "@updf/layout";
import { layout, render } from "../../../tests/fixtures/text-options.js";
import { isEmissionNode } from "../dist/cjs/emission-nodes.js";

function recipes(nodes: readonly NodeDefinition[]): readonly NodeDefinition[] {
  return nodes.flatMap((node) =>
    isEmissionNode(node) ? [node] : node.type === "paintGroup" ? recipes(node.children) : [],
  );
}

function run(adapter: BlockAdapter<unknown>) {
  return layout(
    document({
      children: flow({
        pageSize: { width: 20, height: 20 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions: createExtensions([adapter]),
        children: extension(adapter, {}),
      }),
    }),
  );
}

test("fixed factory retains owned measured recipe identity and final page/fragment context", () => {
  const calls: { page: PageInfo; fragment: FragmentInfo }[] = [];
  function Header() {
    calls.push({ page: useContext(PageContext), fragment: useContext(FragmentContext) });
    return h("rect", { x: 0, y: 0, width: 4, height: 2, paint: { fill: [1, 0, 0], stroke: null } });
  }
  const adapter = defineBlockAdapter({
    name: "native.fixed-factory-recipe",
    validate: (input) => input,
    measure(_props, context) {
      const measured = context.measureContent(
        h(Block, { children: h(Block.Header, { height: 2, children: h(Header, {}) }) }),
        { width: context.width },
      );
      const value = fixed({ width: context.width, height: measured.size.height, children: measured.nodes });
      const before = recipes(measured.nodes),
        after = recipes(value.children);
      assert.ok(before.length > 0);
      assert.equal(after[0], before[0]);
      assert.throws(
        () => nativeInline({ advance: context.width, ascent: value.height, nodes: measured.nodes }),
        (error: unknown) =>
          error instanceof DocumentError &&
          error.diagnostics[0]?.code === "TYPE" &&
          error.diagnostics[0].path === "/nativeInline/nodes",
      );
      assert.deepEqual(calls, []);
      const decorations = context.reserveDecorations([
        { edge: "before", repeat: "first", height: value.height, content: value },
      ]);
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 0 },
        decorations,
        next: () => ({ end: 1, height: 0, nodes: [] }),
      };
    },
  });
  const result = run(adapter);
  assert.deepEqual(calls, [
    {
      page: { docPageNumber: 1, docPageCount: 1, sectionNumber: 1, flow: { index: 0, pageNumber: 1, pageCount: 1 } },
      fragment: { index: 0, count: 1, first: true, last: true },
    },
  ]);
  assert.ok(render(result.document).length > 0);
  assert.equal(calls.length, 1);
});
