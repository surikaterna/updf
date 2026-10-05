import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h, useContext } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  Document,
  defineInlineAdapter,
  Flow,
  FragmentContext,
  inline,
  PageContext,
  Paragraph,
  pageSize,
} from "@updf/layout";
import { layout, lower, render } from "../fixtures/text-options.js";

const margins = { top: 10, right: 10, bottom: 10, left: 10 };
test("atomic and native final-region bounds failures are vertical overflow, not body retry", () => {
  const content = (children: import("@updf/core/vdom").VDOMChild) =>
    h(Document, {
      children: h(Flow, { pageSize: pageSize(200, 100), margins, children: h(Flow.Footer, { height: 12, children }) }),
    });
  for (const children of [
    h(Paragraph, { style: { lineHeight: { unit: "pt", value: 24 } }, keepTogether: true, children: "too tall" }),
    h("rect", { x: 0, y: 0, width: 180, height: 24, paint: { fill: [0, 1, 0], stroke: null } }),
  ]) {
    assert.throws(
      () => layout(content(children)),
      (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VERTICAL_OVERFLOW",
    );
  }
});
test("empty deferred decorations keep reservations without emitting phantom wrappers", () => {
  let calls = 0;
  function Empty() {
    calls++;
    assert.equal(useContext(FragmentContext).count, 3);
    return null;
  }
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: pageSize(200, 100),
      margins,
      children: h(Block, {
        style: { minHeight: 200 },
        children: [
          h(Block.Header, { height: 12, repeat: true, children: h(Empty, {}) }),
          h(Block.Body, { children: [] }),
        ],
      }),
    }),
  });
  const result = layout(tree);
  assert.equal(result.pageCount, 3);
  assert.equal(calls, 3);
  assert.deepEqual(
    result.document.pages.map((page) => page.children.length),
    [1, 1, 1],
  );
});
test("late Flow and Block recipes inherit installed inline adapters and close captured measurement contexts", () => {
  let captured: (() => unknown) | undefined;
  const adapter = defineInlineAdapter<Record<never, never>>({
    name: "late.badge",
    validate: () => ({}),
    measure: (_props, context) => {
      const nodes = [
        { type: "rect" as const, x: 0, y: 0, width: 8, height: 8, paint: { fill: [0, 1, 0] as const, stroke: null } },
      ];
      captured = () => context.measureNative(nodes, { width: 8, height: 8 });
      return {
        advance: 8,
        ascent: 8,
        descent: 0,
        inkBounds: { empty: false, left: 0, top: -8, right: 8, bottom: 0 },
        nodes,
      };
    },
  });
  const extensions = createExtensions([adapter]);
  function Footer() {
    useContext(PageContext);
    return h(Paragraph, { children: ["Page ", inline(adapter, {})] });
  }
  const tree = h(Document, {
    children: h(Flow, {
      pageSize: pageSize(200, 100),
      margins,
      extensions,
      children: [
        h(Block, {
          children: [
            h(Block.Body, { children: h(Paragraph, { children: "Body" }) }),
            h(Block.Footer, { height: 12, children: h(Footer, {}) }),
          ],
        }),
        h(Flow.Footer, { height: 12, children: h(Footer, {}) }),
      ],
    }),
  });
  assert.equal(layout(tree).pageCount, 1);
  assert.ok(captured);
  assert.throws(captured, /closed/);
  assert.ok(render(lower(tree)).length > 0);
});
