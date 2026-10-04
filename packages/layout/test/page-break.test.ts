import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { type Component, createContext, h, lower, useContext } from "@updf/core/vdom";
import {
  Block,
  Column,
  Document,
  document,
  Flow,
  flow,
  layout,
  measure,
  Page,
  PageBreak,
  type PageProps,
  Paragraph,
  paragraph,
  Row,
} from "@updf/layout";

const pageSize = { width: 100, height: 40 };
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const br = { type: "pageBreak" as const };
const zero = { type: "block" as const, children: [] };
function run(children: NonNullable<Parameters<typeof flow>[0]["children"]>) {
  return layout(document({ children: flow({ pageSize, margins, children }) }));
}
function diagnostic(invoke: () => unknown, code: string, path?: RegExp) {
  assert.throws(
    invoke,
    (error: unknown) =>
      error instanceof DocumentError &&
      error.diagnostics[0]?.code === code &&
      (!path || path.test(error.diagnostics[0].path)),
  );
}

for (const [name, tokens, count] of [
  ["empty", "", 1],
  ["leading", "ba", 2],
  ["trailing", "ab", 2],
  ["consecutive", "abba", 3],
  ["break only", "b", 2],
  ["breaks only", "bbb", 4],
  ["zero before", "zb", 2],
  ["zero after", "bz", 2],
  ["zero between", "bzb", 3],
  ["full boundary", "fbz", 2],
] as const) {
  test(`PageBreak/data parity: ${name}`, () => {
    const data = [...tokens].map((token) =>
      token === "b"
        ? br
        : token === "z"
          ? zero
          : token === "f"
            ? { type: "spacer" as const, height: 40 }
            : paragraph({ children: "A" }),
    );
    const jsx = data.map((item) => (item.type === "pageBreak" ? h(PageBreak, {}) : item));
    const expected = run(data),
      actual = run(jsx);
    assert.equal(actual.pageCount, count);
    assert.deepEqual(actual, expected);
    assert.deepEqual(render(actual.document), render(expected.document));
    assert.deepEqual(
      render(lower(h(Document, { children: h(Flow, { pageSize, margins, children: jsx }) }))),
      render(expected.document),
    );
  });
}

test("PageBreak rejects all props and never invokes descendants", () => {
  let calls = 0;
  const Child = () => {
    calls++;
    return h(Paragraph, { children: "unexpected" });
  };
  for (const props of [
    { children: h(Child, {}) },
    { children: undefined },
    { style: {} },
    { keepTogether: true },
    { unknown: undefined },
  ]) {
    diagnostic(() => run(h(PageBreak as unknown as Component<Record<string, unknown>>, props)), "KEY", /\/children\//u);
  }
  assert.equal(calls, 0);
});

test("PageBreak hierarchy and atomic placement match native data rejection", () => {
  diagnostic(() => run(h(Paragraph, { children: h(PageBreak, {}) })), "VDOM_HIERARCHY");
  diagnostic(() => run(h(Row, { children: h(PageBreak, {}) })), "VDOM_HIERARCHY");
  for (const item of [br, h(PageBreak, {})]) {
    diagnostic(() => run(h(Block, { keepTogether: true, children: item })), "TYPE");
    diagnostic(() => run(h(Block, { style: { height: 10 }, children: item })), "TYPE");
    diagnostic(() => run(h(Row, { children: h(Column, { children: item }) })), "TYPE");
    diagnostic(() => measure(item, { width: 100, height: 40 }), "VDOM_HIERARCHY");
    diagnostic(
      () =>
        layout(
          h(Document, { children: h(Page, { size: pageSize, children: item as NonNullable<PageProps["children"]> }) }),
        ),
      item === br ? "TYPE" : "VDOM_HIERARCHY",
    );
    diagnostic(() => run(h(Flow.Footer, { height: 10, children: item })), "VERTICAL_OVERFLOW");
  }
});

test("known invalid PageBreak descendants never execute in inline, Row, fixed Page or section slots", () => {
  let calls = 0;
  const Child = () => {
    calls++;
    return null;
  };
  const invalid = h(PageBreak as unknown as Component<Record<string, unknown>>, { children: h(Child, {}) });
  for (const content of [
    h(Paragraph, { children: invalid }),
    h(Row, { children: invalid }),
    h(Block, { keepTogether: true, children: invalid }),
    h(Block.Header, { height: 10, children: invalid }),
  ]) {
    assert.throws(() => run(content), DocumentError);
  }
  assert.throws(() => layout(h(Document, { children: invalid })), DocumentError);
  assert.throws(() => layout(h(Document, { children: h(Page, { size: pageSize, children: invalid }) })), DocumentError);
  assert.equal(calls, 0);
});

test("fragmentable nested Block uses existing break semantics", () => {
  const data = { type: "block" as const, children: [br, paragraph({ children: "A" }), br] };
  assert.deepEqual(
    run(h(Block, { children: [h(PageBreak, {}), paragraph({ children: "A" }), h(PageBreak, {})] })),
    run(data),
  );
});

test("PageBreak preserves captured providers and parent resource limits", () => {
  const Theme = createContext("default");
  const Child = () => h(Paragraph, { children: useContext(Theme) });
  const tree = h(Theme.Provider, {
    value: "captured",
    children: h(Document, {
      children: h(Flow, { pageSize, margins, children: [h(PageBreak, {}), h(Child, {}), h(PageBreak, {})] }),
    }),
  });
  assert.deepEqual(render(lower(tree)), render(run([br, paragraph({ children: "captured" }), br]).document));
  diagnostic(() => lower(tree, { limits: { pages: 2 } }), "LIMIT", /^\/tree\//u);
  diagnostic(() => lower(tree, { limits: { textCodePoints: 7 } }), "LIMIT", /^\/tree\//u);
});
