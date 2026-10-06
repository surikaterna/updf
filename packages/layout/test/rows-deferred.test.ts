import assert from "node:assert/strict";
import test from "node:test";
import { richInput } from "../../../tests/fixtures/rich-input.js";
import { DocumentError } from "@updf/core";
import { type ComponentContext, createContext, h, useContext } from "@updf/core/vdom";
import {
  Block,
  column,
  createExtensions,
  defineBlockAdapter,
  document,
  extension,
  type FlowBlock,
  FragmentContext,
  flow,
  type MeasureContext,
  PageContext,
  Paragraph,
  row,
} from "@updf/layout";
import { layout, render } from "../../../tests/fixtures/text-options.js";

test("#44 Rows retain measured deferred recipes until selected page/fragment and provider contexts finalize", () => {
  const Theme = createContext("NONE");
  const calls: string[] = [];
  let retained: ComponentContext | undefined;
  function Header(_props: Record<string, never>, context: ComponentContext) {
    retained = context;
    const page = useContext(PageContext),
      fragment = useContext(FragmentContext);
    const label = `${useContext(Theme)}:${page.docPageNumber}:${fragment.index + 1}/${fragment.count}`;
    calls.push(label);
    return h(Paragraph, { children: label });
  }
  const content = h(Theme.Provider, {
    value: "ROW",
    children: h(Block, {
      children: [h(Block.Header, { height: 10, children: h(Header, {}) }), h(Paragraph, { children: "BODY" })],
    }),
  });
  const adapter = owner(content);
  const descriptor = extension(adapter, {}),
    extensions = createExtensions([adapter]);
  const item = row({ children: [column({ children: [descriptor] })] });
  const input = document({
    children: flow({
      pageSize: { width: 100, height: 25 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions,
      children: [{ type: "spacer", height: 6 }, item, item],
    }),
  });
  assert.deepEqual(calls, []);
  const result = layout(input);
  assert.deepEqual(calls, ["ROW:2:1/1", "ROW:3:1/1"]);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.match(pdf, /ROW:2:1\/1/);
  assert.match(pdf, /ROW:3:1\/1/);
  assert.ok(retained);
  checkClosed(retained);
});
function checkClosed(retained: ComponentContext): void {
  assert.throws(
    () => retained.measurement.measureText(richInput("x", 100, 10, 10)),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
  );
}
function owner(content: ReturnType<typeof h>) {
  return defineBlockAdapter({
    name: "row.deferred-owner",
    validate: (input) => input,
    measure(_props, context: MeasureContext) {
      const measured = context.measureContent(content as unknown as FlowBlock, { width: context.width });
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: measured.size,
        fragment: () => ({ status: "placed", nextOffset: 1, height: measured.size.height, nodes: measured.nodes }),
      };
    },
  });
}
