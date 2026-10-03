import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, useContext } from "@updf/core/vdom";
import { Table, table, tableExtension } from "@updf/tables";
import { fixtureFont } from "../../../tests/fixtures/fonts/font-fixture.js";
import {
  createExtensions,
  Document,
  defineBlockAdapter,
  extension,
  Flow,
  FragmentContext,
  layout,
  layoutFlow,
  PageContext,
  Paragraph,
  paragraph,
  span,
} from "../../../tests/fixtures/transitional-layout.js";

const columns = [{ width: 90 }, { width: 90 }] as const;
const pageTemplate = { width: 200, height: 100, margins: { top: 5, right: 5, bottom: 5, left: 5 } };
test("F prepared fonts, opaque aliases and table-column-cell-paragraph-Span style inheritance share the operation", async () => {
  const font = await fixtureFont();
  const options = {
    resources: { Demo: font, Alias: font },
    profile: "service" as const,
    limits: { fontBytes: font.metadata.byteLength },
  };
  const input = table({
    columns: [{ width: 90, style: { defaultStyle: { font: "Alias" } } }, { width: 90 }],
    style: { defaultStyle: { font: "Demo", fontSize: 10 } },
    body: [
      {
        cells: [
          { children: "Привет" },
          {
            style: { defaultStyle: { fontSize: 11 } },
            children: paragraph({
              children: ["AB", span({ children: "CD", style: { fontSize: 13, color: [1, 0, 0] } })],
              defaultStyle: { fontSize: 12 },
            }),
          },
        ],
      },
    ],
  });
  const result = layoutFlow({ pageTemplate, body: [input] }, options, createExtensions([tableExtension]));
  assert.ok(render(result.document, options).length > font.metadata.byteLength);
  assert.match(new TextDecoder().decode(render(result.document, options)), /13 Tf/u);
  assert.throws(
    () => layoutFlow({ pageTemplate, body: [input] }, {}, createExtensions([tableExtension])),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.path.includes("props/style"),
  );
});
test("F shared owned chart descriptors measure once across cell compilers, but each occurrence paints", () => {
  let measurements = 0;
  const chart = defineBlockAdapter({
    name: "test.shared-chart",
    validate: (input) => input,
    measure(_props, context) {
      measurements++;
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 10 },
        fragment: () => ({
          status: "placed",
          nextOffset: 1,
          height: 10,
          nodes: [{ type: "rect", x: 0, y: 0, width: 10, height: 10, paint: { fill: [1, 0, 0], stroke: null } }],
        }),
      };
    },
  });
  const shared = extension(chart, {});
  const result = layoutFlow(
    { pageTemplate, body: [table({ columns, body: [{ cells: [{ children: shared }, { children: shared }] }] })] },
    {},
    createExtensions([tableExtension, chart]),
  );
  assert.equal(measurements, 1);
  assert.equal((new TextDecoder().decode(render(result.document)).match(/1 0 0 rg/gu) ?? []).length, 2);
});
test("F data descriptors reused under different providers preserve each nearest snapshot", () => {
  const Theme = createContext({ text: "default" });
  function Text() {
    return h(Paragraph, { children: useContext(Theme).text });
  }
  const shared = table({ columns, body: [{ cells: [{ children: h(Text, {}) }, { children: "1" }] }] });
  const section = h(Flow, {
    pageSize: { width: 200, height: 100 },
    margins: pageTemplate.margins,
    extensions: createExtensions([tableExtension]),
    children: shared,
  });
  const content = h(Document, {
    children: [
      h(Theme.Provider, { value: { text: "first" }, children: section }),
      h(Theme.Provider, { value: { text: "second" }, children: section }),
    ],
  });
  const text = new TextDecoder().decode(render(layout(content).document));
  assert.match(text, /first/u);
  assert.match(text, /second/u);
  assert.doesNotMatch(text, /default/u);
});
test("F early final-context misuse is structured and header/foot slots and body roles remain strict", () => {
  const content = h(Table, { columns, children: [h(Table.Body, {}), h(Table.Body, {})] });
  const root = h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 100 },
      margins: pageTemplate.margins,
      extensions: createExtensions([tableExtension]),
      children: content,
    }),
  });
  assert.throws(
    () => layout(root),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "VDOM_HIERARCHY",
  );
  function Early() {
    return h(Paragraph, { children: String(useContext(PageContext).docPageNumber) });
  }
  const early = table({ columns, head: { rows: [{ cells: [{ children: h(Early, {}) }, {}] }] }, body: [] });
  assert.throws(
    () => layoutFlow({ pageTemplate, body: [early] }, {}, createExtensions([tableExtension])),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "MEASUREMENT_CONTEXT",
  );
});
test("F finite numeric inline arrays are implicit cell text, not a relaxation of explicit Paragraph grammar", () => {
  const input = table({ columns, body: [{ cells: [{ children: [1, " units"] }, { children: 2 }] }] });
  const result = layoutFlow({ pageTemplate, body: [input] }, {}, createExtensions([tableExtension]));
  const text = [...new TextDecoder().decode(render(result.document)).matchAll(/\(([^)]+)\) Tj/gu)]
    .map((match) => match[1])
    .join("");
  assert.equal(text, "1 units2");
  assert.throws(
    () =>
      layoutFlow(
        { pageTemplate, body: [table({ columns, body: [{ cells: [{ children: [Number.NaN] }, {}] }] })] },
        {},
        createExtensions([tableExtension]),
      ),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "TYPE",
  );
});
test("F explicitly reserved whole head callbacks are opaque until finalization and page exhaustion precedes callbacks", () => {
  let calls = 0;
  function HeaderRow() {
    calls++;
    const page = useContext(PageContext),
      fragment = useContext(FragmentContext);
    return h(Table.Row, {
      children: [
        h(Table.HeaderCell, { children: `Page ${page.docPageNumber}/${page.docPageCount}` }),
        h(Table.HeaderCell, { children: `Part ${fragment.index + 1}/${fragment.count}` }),
      ],
    });
  }
  const content = h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 100 },
      margins: pageTemplate.margins,
      extensions: createExtensions([tableExtension]),
      children: h(Table, {
        columns,
        children: [
          h(Table.Head, { repeat: true, height: 20, children: h(HeaderRow, {}) }),
          h(Table.Body, {
            children: Array.from({ length: 5 }, (_, i) =>
              h(Table.Row, { children: [h(Table.Cell, { children: `Row ${i}` }), h(Table.Cell, { children: "1" })] }),
            ),
          }),
        ],
      }),
    }),
  });
  assert.throws(
    () => layout(content, { profile: "service", limits: { pages: 1 } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
  assert.equal(calls, 0);
  const result = layout(content);
  assert.equal(calls, result.pageCount);
});
test("F supplied font declarations validate even when overridden or unused", () => {
  for (const body of [
    [],
    [{ cells: [{ children: paragraph({ children: "A", defaultStyle: { font: "Helvetica" } }) }, {}] }],
  ]) {
    const input = table({ columns, style: { defaultStyle: { font: "Missing" } }, body });
    assert.throws(
      () => layoutFlow({ pageTemplate, body: [input] }, {}, createExtensions([tableExtension])),
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === "FONT_RESOURCE" &&
        error.diagnostics[0]?.path.includes("props/style"),
    );
  }
});
