import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createContext, h, lower, useContext } from "@updf/core/vdom";
import { Table, type TableInput, table, tableExtension } from "@updf/tables";
import { chart, chartAdapter } from "../../../tests/fixtures/chart.js";
import {
  type BlockContent,
  createExtensions,
  Document,
  Flow,
  FragmentContext,
  layout,
  layoutFlow,
  PageContext,
  Paragraph,
  paragraph,
} from "../../../tests/fixtures/transitional-layout.js";

const extensions = createExtensions([tableExtension, chartAdapter]);
const pageTemplate = { width: 200, height: 100, margins: { top: 5, right: 5, bottom: 5, left: 5 } };
const columns = [{ width: 120 }, { width: 60 }] as const;
function definition(count = 8): TableInput {
  return {
    columns,
    style: { padding: 4, lineHeight: { unit: "pt", value: 12 } },
    head: { repeat: true, rows: [{ cells: [{ children: "Description" }, { children: "Count" }] }] },
    body: Array.from({ length: count }, (_, i) => ({
      cells: [{ children: `Item ${i + 1}` }, { children: String(i + 1) }],
    })),
    foot: { rows: [{ cells: [{ children: "Totals" }, { children: String(count) }] }] },
  };
}
function run(input: TableInput) {
  return layoutFlow({ pageTemplate, body: [table(input)] }, {}, extensions);
}
function root(content: BlockContent) {
  return h(Document, {
    children: h(Flow, {
      pageSize: { width: 200, height: 100 },
      margins: pageTemplate.margins,
      extensions,
      children: content,
    }),
  });
}
function rejects(callback: () => unknown, code: string) {
  assert.throws(callback, (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code);
}
function cells(first: BlockContent | string, second: string) {
  return [h(Table.Cell, { children: first }), h(Table.Cell, { children: second })];
}
test("separate public table adapter paginates atomic rows with shared static head/foot reservations", () => {
  const result = run(definition());
  assert.ok(result.pageCount > 1);
  assert.equal(result.consumed, 1);
  assert.ok(render(result.document).length > 0);
});
test("empty tables consume zero geometry; header and foot-only empty bodies are meaningful", () => {
  assert.equal(run({ columns, body: [] }).placements[0]?.box.height, 0);
  assert.deepEqual(run({ columns, body: [] }).placements[0]?.sourceRange, { start: 0, end: 0 });
  const foot = { rows: [{ cells: [{ children: "Totals" }, { children: "0" }] }] };
  assert.equal(run({ columns, body: [], foot }).placements[0]?.box.height, 18);
  assert.equal(run(definition(0)).placements[0]?.box.height, 40);
});
test("ordinary core JSX Table and readonly data use the same adapter/native output path", () => {
  const input = definition(2);
  const content = h(Table, {
    columns,
    style: { padding: 4, lineHeight: { unit: "pt", value: 12 } },
    children: [
      h(Table.Head, {
        repeat: true,
        children: h(Table.Row, {
          children: [h(Table.HeaderCell, { children: "Description" }), h(Table.HeaderCell, { children: "Count" })],
        }),
      }),
      h(Table.Body, {
        children: input.body.map((_row, i) =>
          h(Table.Row, { keepTogether: true, children: cells(`Item ${i + 1}`, String(i + 1)) }, i),
        ),
      }),
      h(Table.Foot, { children: h(Table.Row, { children: cells("Totals", "2") }) }),
    ],
  });
  assert.deepEqual(render(layout(root(content)).document), render(run(input).document));
});
test("Table is block content in a normal mixed Document/Flow with ordinary lower/render", () => {
  const content = root([
    h(Paragraph, { children: "Before" }),
    h(Table, { columns, children: h(Table.Body, { children: h(Table.Row, { children: cells("Cell", "1") }) }) }),
    h(Paragraph, { children: "After" }),
  ]);
  const result = layout(content);
  assert.deepEqual(render(result.document), render(lower(content)));
});
test("cells reuse the native stack engine for paragraphs and application-owned chart blocks", () => {
  const result = run({
    columns,
    body: [
      {
        cells: [
          {
            children: [
              paragraph({ children: "Intro" }),
              chart({ height: 40, values: [0.2, 0.8] }),
              paragraph({ children: "Conclusion" }),
            ],
          },
          { children: "1" },
        ],
      },
    ],
  });
  assert.equal(result.placements[0]?.box.height, 68);
  assert.ok(render(result.document).length > 0);
});
test("nearest providers around cells are captured and restored through the public author-part bridge", () => {
  const Theme = createContext({ text: "default" });
  function Themed() {
    return h(Paragraph, { children: useContext(Theme).text });
  }
  const content = h(Table, {
    columns,
    children: h(Table.Body, {
      children: h(Table.Row, {
        children: [
          h(Theme.Provider, { value: { text: "captured" }, children: h(Table.Cell, { children: h(Themed, {}) }) }),
          h(Table.Cell, { children: "1" }),
        ],
      }),
    }),
  });
  const bytes = render(layout(root(content)).document);
  assert.match(new TextDecoder().decode(bytes), /captured/u);
  assert.doesNotMatch(new TextDecoder().decode(bytes), /default/u);
});
test("mixed inline/block cells, wrong roles and row splitting reject explicitly", () => {
  rejects(
    () =>
      run({
        columns,
        body: [
          {
            cells: [
              { children: ["naked", paragraph({ children: "block" })] as unknown as BlockContent },
              { children: "1" },
            ],
          },
        ],
      }),
    "VDOM_HIERARCHY",
  );
  rejects(() => run({ columns, body: [{ keepTogether: false, cells: [{}, {}] }] } as unknown as TableInput), "TYPE");
  const split = h(Table, {
    columns,
    children: h(Table.Body, {
      children: h(Table.Row, {
        keepTogether: false,
        children: cells("Cell", "1"),
      } as unknown as Parameters<typeof Table.Row>[0]),
    }),
  });
  rejects(() => layout(root(split)), "TYPE");
  const invalid = h(Table, { columns, children: h(Table.Body, { children: h(Table.Cell, { children: "wrong" }) }) });
  rejects(() => layout(root(invalid)), "VDOM_HIERARCHY");
});
test("obsolete atomic is rejected in data and JSX rather than treated as an alias", () => {
  for (const atomic of [true, false]) {
    rejects(() => run({ columns, body: [{ atomic, cells: [{}, {}] }] } as unknown as TableInput), "KEY");
    const content = h(Table, {
      columns,
      children: h(Table.Body, {
        children: h(Table.Row, { atomic, children: cells("Cell", "1") } as unknown as Parameters<typeof Table.Row>[0]),
      }),
    });
    rejects(() => layout(root(content)), "KEY");
  }
});
test("rows fit exactly, advance intact and reject fresh-page oversize under either overflow policy", () => {
  for (const overflow of ["error", "hidden"] as const) {
    const input = {
      columns,
      style: { overflow },
      body: [{ keepTogether: true, minHeight: 90, cells: [{}, {}] }],
    } as const;
    assert.equal(run(input).placements[0]?.box.height, 90);
    const moved = layoutFlow({ pageTemplate, body: [{ type: "spacer", height: 1 }, table(input)] }, {}, extensions);
    assert.equal(moved.placements[1]?.pageIndex, 1);
    assert.equal(moved.placements[1]?.box.height, 90);
    rejects(() => run({ ...input, body: [{ ...input.body[0], minHeight: 91 }] }), "LAYOUT_OVERSIZED");
  }
});
test("oversized row is never shrunk, lost, or painted as a header-only page", () => {
  rejects(
    () => run({ ...definition(1), body: [{ cells: [{ children: "Huge" }, { children: "1" }], minHeight: 100 }] }),
    "LAYOUT_OVERSIZED",
  );
});
test("strict descriptors, unknown fields, invalid widths and malformed row lengths reject", () => {
  let reads = 0;
  const getter = Object.defineProperty({}, "columns", {
    enumerable: true,
    get() {
      reads++;
      return columns;
    },
  });
  rejects(() => table(getter as TableInput), "TYPE");
  rejects(() => table({ columns, body: [{ cells: [{}] }] }), "TYPE");
  rejects(() => table({ columns: [{ width: 0 }], body: [] }), "GEOMETRY");
  rejects(() => table({ ...definition(0), colspan: 2 } as TableInput), "KEY");
  assert.equal(reads, 0);
});
test("explicit head reservations defer cells until final fragment/page contexts are sealed", () => {
  const seen: string[] = [];
  function Header() {
    const fragment = useContext(FragmentContext),
      page = useContext(PageContext);
    const text = `Head ${fragment.index + 1}/${fragment.count} page ${page.docPageNumber}/${page.docPageCount}`;
    seen.push(text);
    return h(Paragraph, { children: text, style: { fontSize: 6, lineHeight: { unit: "pt", value: 8 } } });
  }
  const content = h(Table, {
    columns,
    children: [
      h(Table.Head, { repeat: true, height: 20, children: h(Table.Row, { children: cells(h(Header, {}), "Count") }) }),
      h(Table.Body, {
        children: definition(10).body.map((_row, i) => h(Table.Row, { children: cells(`Item ${i + 1}`, "1") }, i)),
      }),
    ],
  });
  const result = layout(root(content));
  assert.equal(seen.length, result.placements.length);
  assert.equal(seen.length, result.pageCount);
  assert.match(seen[0] ?? "", new RegExp(`Head 1/${seen.length} page 1/${result.pageCount}`, "u"));
  assert.ok(render(result.document).length > 0);
});
test("source ranges count each body row once and decorations do not count as body consumption", () => {
  const result = run(definition(8));
  assert.deepEqual(
    result.placements.flatMap((placement) => {
      const range = placement.sourceRange;
      assert.ok(range);
      return Array.from({ length: range.end - range.start }, (_, i) => range.start + i);
    }),
    [0, 1, 2, 3, 4, 5, 6, 7],
  );
});
test("nested tables and overflowing closed cells reject; hidden cells use native C clipping", () => {
  rejects(
    () => run({ columns, body: [{ cells: [{ children: table({ columns: [{ width: 40 }], body: [] }) }, {}] }] }),
    "VDOM_HIERARCHY",
  );
  const children = [paragraph({ children: "First" }), paragraph({ children: "Second" })];
  rejects(() => run({ columns, body: [{ cells: [{ children, style: { height: 20 } }, {}] }] }), "VERTICAL_OVERFLOW");
  const result = run({ columns, body: [{ cells: [{ children, style: { height: 20, overflow: "hidden" } }, {}] }] });
  assert.match(new TextDecoder().decode(render(result.document)), /re W n/u);
});
test("whole-document service quotas aggregate multiple tables and repeated headers", () => {
  const input = { columns, body: [{ cells: [{ children: "AB" }, { children: "CD" }] }] } as const;
  rejects(
    () =>
      layoutFlow(
        { pageTemplate, body: [table(input), table(input)] },
        { profile: "service", limits: { textCodePoints: 7 } },
        extensions,
      ),
    "LIMIT",
  );
  assert.equal(
    layoutFlow(
      { pageTemplate, body: [table(input), table(input)] },
      { profile: "service", limits: { textCodePoints: 8 } },
      extensions,
    ).pageCount,
    1,
  );
});
