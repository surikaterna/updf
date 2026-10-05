import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { Fragment } from "@updf/core/jsx-runtime";
import { type ComponentContext, createContext, h, useContext } from "@updf/core/vdom";
import {
  Block,
  Column,
  column,
  Document,
  document,
  Flow,
  flow,
  PageContext,
  Paragraph,
  paragraph,
  Row,
  row,
} from "@updf/layout";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const options = { pageSize: { width: 100, height: 40 }, margins };
function diagnostic(invoke: () => unknown, code: string, path?: string) {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (path === undefined || error.diagnostics[0]?.path === path),
  );
}
test("#44 public semantic Row exact data measurement, geometry and deterministic PDF parity for all alignments", () => {
  for (const align of ["top", "middle", "bottom", "stretch"] as const) {
    const style = { gap: 4, padding: 2 };
    const left = { padding: 1, backgroundColor: [1, 0, 0] as const };
    const right = { padding: 3 };
    const data = row({
      align,
      style,
      children: [
        column({ width: 30, style: left, children: [paragraph({ children: "L" })] }),
        column({ style: right, children: [paragraph({ children: "R" })] }),
      ],
    });
    const native = h(Row, {
      align,
      style,
      children: [
        h(Column, { width: 30, style: left, children: [h(Paragraph, { children: "L" })] }),
        h(Column, { style: right, children: [h(Paragraph, { children: "R" })] }),
      ],
    });
    assert.deepEqual(measure(native, { width: 100 }), measure(data, { width: 100 }));
    const expected = layout(
      document({ children: flow({ ...options, children: [{ type: "spacer", height: 30 }, data] }) }),
    );
    const actual = layout(
      h(Document, { children: h(Flow, { ...options, children: [{ type: "spacer", height: 30 }, native] }) }),
    );
    assert.deepEqual(actual, expected);
    assert.equal(actual.pageCount, 2);
    assert.deepEqual(render(actual.document), render(expected.document));
  }
});
test("#44 semantic known Columns defer descendants until every track, inset and stretch constraint preflights", () => {
  let calls = 0;
  function Child() {
    calls++;
    return h(Paragraph, { children: "A" });
  }
  const first = h(Column, { width: 80, children: h(Child, {}) });
  for (const [align, second, code] of [
    ["top", { width: 80 }, "GEOMETRY"],
    ["top", { width: 20, style: { padding: 11 } }, "GEOMETRY"],
    ["stretch", { width: 20, style: { height: 10 } }, "TYPE"],
  ] as const) {
    const item = h(Row, { align, children: [first, h(Column, { ...second, children: [] })] });
    diagnostic(() => measure(item, { width: 100 }), code);
    diagnostic(() => layout(h(Document, { children: h(Flow, { ...options, children: item }) })), code);
    assert.equal(calls, 0);
  }
  assert.equal(
    measure(h(Row, { children: [first, h(Column, { width: 20, children: [] })] }), { width: 100 }).size.height,
    10,
  );
  assert.equal(calls, 1);
});
test("#44 wrappers, Fragments and providers produce Columns; captured page scope remains live only during operation", () => {
  const Theme = createContext("NONE");
  const calls: string[] = [];
  let retained: ComponentContext | undefined;
  function Header(_props: Record<string, never>, context: ComponentContext) {
    retained = context;
    const text = `${useContext(Theme)}:${useContext(PageContext).docPageNumber}`;
    calls.push(text);
    return h(Paragraph, { children: text });
  }
  function Wrapper() {
    return h(Fragment, {
      children: h(Column, {
        children: h(Block, {
          children: [h(Block.Header, { height: 10, children: h(Header, {}) }), h(Paragraph, { children: "BODY" })],
        }),
      }),
    });
  }
  const item = h(Row, { children: h(Theme.Provider, { value: "ROW", children: h(Wrapper, {}) }) });
  const result = layout(
    h(Document, { children: h(Flow, { ...options, children: [{ type: "spacer", height: 30 }, item] }) }),
  );
  assert.deepEqual(calls, ["ROW:2"]);
  assert.match(new TextDecoder().decode(render(result.document)), /ROW:2/);
  assert.ok(retained);
  diagnostic(
    () =>
      retained?.measurement.measureText({
        kind: "plain",
        text: "x",
        width: 100,
        fontSize: 10,
        lineHeight: 10,
        align: "left",
      }),
    "MEASUREMENT_CONTEXT",
  );
});
test("#44 Row rejects direct non-Columns at their actual wrapper source path", () => {
  for (const child of [
    "bare",
    h(Paragraph, { children: "P" }),
    h("rect", { x: 0, y: 0, width: 1, height: 1, paint: { fill: [0, 0, 0], stroke: null } }),
  ]) {
    function Wrapper() {
      return h(Fragment, { children: [child] });
    }
    diagnostic(
      () => measure(h(Row, { children: h(Wrapper, {}) }), { width: 100 }),
      "VDOM_HIERARCHY",
      "/content/children/expanded/children/0",
    );
  }
});
test("#44 semantic deferred descendants retain cycle and depth budgets", () => {
  function Cycle(): ReturnType<typeof h> {
    return h(Column, { children: h(Cycle, {}) });
  }
  diagnostic(() => measure(h(Row, { children: h(Column, { children: h(Cycle, {}) }) }), { width: 100 }), "VDOM_CYCLE");
  let content = h(Paragraph, { children: "A" });
  for (let i = 0; i < 6; i++) content = h(Column, { children: content });
  diagnostic(() => measure(content, { width: 100 }, { limits: { depth: 4 } }), "LIMIT");
  assert.equal(measure(content, { width: 100 }).size.height, 10);
});
test("#44 direct Flow rejects invalid Row children before descendant expansion at authored paths", () => {
  let calls = 0;
  function Descendant() {
    calls++;
    return "INVALID";
  }
  function Wrapper() {
    return h(Fragment, { children: [h(Paragraph, { children: h(Descendant, {}) })] });
  }
  const invalid = h(Row, { children: h(Wrapper, {}) });
  diagnostic(() => measure(invalid, { width: 100 }), "VDOM_HIERARCHY", "/content/children/expanded/children/0");
  for (const [children, path] of [
    [invalid, "/document/children/children/children/expanded/children/0"],
    [h(Block, { children: invalid }), "/document/children/children/children/children/expanded/children/0"],
  ] as const) {
    diagnostic(() => layout(h(Document, { children: h(Flow, { ...options, children }) })), "VDOM_HIERARCHY", path);
    assert.equal(calls, 0);
  }
});
test("#44 Flow slots and direct body preserve valid wrapped nested Rows", () => {
  function Wrapper() {
    return h(Fragment, {
      children: h(Column, { children: h(Row, { children: h(Column, { children: h(Paragraph, { children: "N" }) }) }) }),
    });
  }
  const nested = h(Row, { children: h(Wrapper, {}) });
  const regions = [h(Flow.Header, { height: 10, children: nested }), h(Flow.Footer, { height: 10, children: nested })];
  const direct = layout(h(Document, { children: h(Flow, { ...options, children: [...regions, nested] }) }));
  const slots = layout(
    h(Document, { children: h(Flow, { ...options, children: [...regions, h(Flow.Body, { children: nested })] }) }),
  );
  assert.deepEqual(slots.document, direct.document);
  assert.equal(slots.pageCount, 1);
  assert.match(new TextDecoder().decode(render(slots.document)), /N/);
});
