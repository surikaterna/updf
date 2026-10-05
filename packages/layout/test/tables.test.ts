import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { layoutTable, layoutTableFlow, layoutTableUnknown, type TableDefinition } from "../dist/cjs/tables/index.js";
import { Tables } from "../dist/cjs/tables/vdom.js";

const pageTemplate = { width: 120, height: 60, margins: { top: 0, right: 0, bottom: 0, left: 0 } };
function table(count = 4): TableDefinition {
  return {
    type: "table",
    columns: [{ width: 60 }, { width: 60 }],
    defaults: {
      defaultStyle: { font: "Helvetica", fontSize: 8, color: [0, 0, 0] },
      lineHeight: 10,
      align: "left",
      whiteSpace: "preserve",
      breakLongWords: "codePoint",
      padding: 0,
    },
    rows: Array.from({ length: count }, (_, i) => ({
      cells: [{ paragraph: { runs: [{ text: `row${i}` }] } }, { paragraph: { runs: [] } }],
    })),
    header: { cells: [{ paragraph: { runs: [{ text: "Header" }] } }, { paragraph: { runs: [] } }] },
    repeatHeader: true,
    align: "left",
  };
}
function diagnostic(input: unknown, code: string, path: string): void {
  assert.throws(
    () => layoutTableUnknown(input),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]?.code, code);
      assert.equal(error.diagnostics[0]?.path, path);
      return true;
    },
  );
}
test("atomic rows, repeated header and row consumption remain stable across pages", () => {
  const result = layoutTable({ pageTemplate, table: table(11) });
  assert.equal(result.pageCount, 3);
  assert.equal(result.consumedBodyRowCount, 11);
  assert.equal(result.repeatedHeaderCount, 2);
  assert.deepEqual(
    result.tablePlacements.filter((p) => p.rowIndex >= 0).map((p) => p.rowIndex),
    Array.from({ length: 11 }, (_, i) => i),
  );
  assert.ok(Object.isFrozen(result.document.pages[0]?.children));
  assert.ok(render(result.document).length > 0);
});
test("standalone and mixed native TSX use ordinary core output byte-identically", () => {
  const definition = { pageTemplate, table: table(9) };
  assert.deepEqual(render(layoutTable(definition).document), render(lower(h(Tables.Document, definition))));
  const { padding: _padding, ...paragraphDefaults } = table().defaults;
  void _padding;
  const mixed = {
    pageTemplate,
    body: [
      { type: "spacer" as const, height: 10 },
      table(7),
      { type: "paragraph" as const, paragraph: { runs: [{ text: "After" }], ...paragraphDefaults } },
      table(2),
    ],
  };
  const result = layoutTableFlow(mixed);
  assert.equal(result.consumed, 4);
  assert.deepEqual(
    result.tablePlacements.filter((p) => p.rowIndex === 0).map((p) => p.tableIndex),
    [0, 1],
  );
  assert.deepEqual(render(result.document), render(lower(h(Tables.Document, mixed))));
});
test("header and first row move together, and an impossible pair errors on row", () => {
  const result = layoutTableFlow({ pageTemplate, body: [{ type: "spacer", height: 50 }, table(1)] });
  assert.equal(result.tablePlacements[0]?.pageIndex, 1);
  const value = table(1);
  diagnostic({ pageTemplate: { ...pageTemplate, height: 15 }, table: value }, "LAYOUT_OVERSIZED", "/table/rows/0");
});
test("oversized rows reject before repeated header and never shrink or drop", () => {
  const value = table(1);
  diagnostic(
    { pageTemplate, table: { ...value, rows: [{ ...value.rows[0], minRowHeight: 51 }] } },
    "LAYOUT_OVERSIZED",
    "/table/rows/0",
  );
});
test("empty table has no geometry, empty header prints once, and blank cells occupy a line", () => {
  const { header: _header, ...value } = table(0);
  void _header;
  const empty = layoutTable({ pageTemplate, table: value });
  assert.equal(empty.pageCount, 1);
  assert.equal(empty.placements.length, 0);
  assert.equal(layoutTable({ pageTemplate, table: table(0) }).tablePlacements.length, 1);
  assert.equal(layoutTable({ pageTemplate, table: table(1) }).tablePlacements[1]?.box.height, 10);
});
test("wrapped cell determines max row height; padding, grid and minimum reserve explicit space", () => {
  const value = table(1);
  const result = layoutTable({
    pageTemplate: { ...pageTemplate, height: 100 },
    table: {
      ...value,
      grid: { width: 1, color: [0, 0, 0] },
      rows: [
        {
          minRowHeight: 30,
          cells: [{ paragraph: { runs: [{ text: "one\ntwo\nthree" }] }, padding: 2 }, { paragraph: { runs: [] } }],
        },
      ],
    },
  });
  assert.equal(result.tablePlacements[1]?.box.height, 36);
  assert.ok(render(result.document).length > 0);
});
test("style inheritance is per-key and run overrides remain effective", () => {
  const value = table(1);
  const result = layoutTable({
    pageTemplate,
    table: {
      ...value,
      columns: [{ width: 60, defaults: { defaultStyle: { color: [1, 0, 0] }, align: "right" } }, { width: 60 }],
      rows: [
        {
          cells: [
            {
              paragraph: {
                defaultStyle: { fontSize: 9 },
                runs: [{ text: "A", style: { color: [0, 0, 1] } }, { text: "B" }],
              },
            },
            { paragraph: { runs: [] } },
          ],
        },
      ],
    },
  });
  const group = result.document.pages[0]?.children[1];
  assert.ok(group?.type === "paintGroup");
  const node = group.children[0];
  assert.ok(node?.type === "richText");
  assert.equal(node.paragraphs[0]?.align, "right");
  assert.deepEqual(
    node.paragraphs[0]?.runs.map((run) => run.style?.color),
    [
      [0, 0, 1],
      [1, 0, 0],
    ],
  );
});
test("exact fit creates no extra page; trusted tables can create page 21", () => {
  assert.equal(layoutTable({ pageTemplate, table: table(5) }).pageCount, 1);
  assert.equal(layoutTable({ pageTemplate, table: table(100) }).pageCount, 20);
  assert.equal(layoutTable({ pageTemplate, table: table(101) }).pageCount, 21);
  assert.throws(() => layoutTable({ pageTemplate, table: table(101) }, { profile: "service" }), DocumentError);
});
test("strict shape, widths, cell counts, padding and unknown style keys reject", () => {
  diagnostic({ pageTemplate, table: { ...table(), columns: [] } }, "VALUE", "/table/columns");
  diagnostic({ pageTemplate, table: { ...table(), columns: [{ width: 0 }] } }, "GEOMETRY", "/table/columns/0/width");
  diagnostic({ pageTemplate, table: { ...table(), rows: [{ cells: [] }] } }, "VALUE", "/table/rows/0/cells");
  diagnostic(
    { pageTemplate, table: { ...table(), defaults: { ...table().defaults, padding: Infinity } } },
    "GEOMETRY",
    "/table/defaults/padding",
  );
  diagnostic(
    { pageTemplate, table: { ...table(), defaults: { ...table().defaults, bold: true } } },
    "KEY",
    "/table/defaults/bold",
  );
});
test("source getters never execute and exact run diagnostics preserve source paths", () => {
  let calls = 0;
  diagnostic(
    {
      pageTemplate,
      table: {
        ...table(),
        get rows() {
          calls++;
          return [];
        },
      },
    },
    "TYPE",
    "/table/rows",
  );
  assert.equal(calls, 0);
  const value = table(1);
  diagnostic(
    {
      pageTemplate,
      table: { ...value, rows: [{ cells: [{ paragraph: { runs: [{ text: "é" }] } }, { paragraph: { runs: [] } }] }] },
    },
    "CHARACTER",
    "/table/rows/0/cells/0/paragraph/runs/0/text",
  );
});
test("table width does not borrow measurement tolerance; narrow derived cells reject", () => {
  diagnostic(
    { pageTemplate, table: { ...table(), columns: [{ width: 60 }, { width: 60.00000000000003 }] } },
    "GEOMETRY",
    "/table/columns",
  );
  diagnostic(
    { pageTemplate, table: { ...table(), defaults: { ...table().defaults, padding: 30 } } },
    "GEOMETRY",
    "/table/rows/0/cells/0",
  );
});
test("placement alignment, shared edges and full-width zero-margin stroke geometry are explicit", () => {
  for (const align of ["left", "center", "right"] as const) {
    const result = layoutTable({
      pageTemplate: { ...pageTemplate, width: 160 },
      table: { ...table(2), align, grid: { width: 1, color: [0, 0, 0] } },
    });
    assert.equal(result.tablePlacements[0]?.box.x, align === "left" ? 0 : align === "center" ? 20 : 40);
    const groups = result.document.pages[0]?.children;
    assert.ok(groups);
    const horizontal = groups
      .flatMap((node) => (node.type === "paintGroup" ? node.children : []))
      .filter((node) => node.type === "line" && node.y === node.y2);
    assert.equal(horizontal.length, 4);
    assert.ok(render(result.document).length > 0);
  }
});
test("cell-local derived origins keep the approved conditioning policy and reject erased widths", () => {
  const value = table(1);
  diagnostic(
    {
      pageTemplate: { ...pageTemplate, width: 2 ** 56 },
      table: {
        ...value,
        columns: [{ width: 2 ** 55 }, { width: 1 }],
      },
    },
    "GEOMETRY",
    "/table/rows/0/cells/1",
  );
  const fractional = {
    ...value,
    columns: [{ width: 60.03 }, { width: 60.03 }],
    defaults: { ...value.defaults, lineHeight: 10.3 },
    rows: [{ cells: [{ paragraph: { runs: [{ text: "A\nA\nA" }] } }, { paragraph: { runs: [] } }] }],
  };
  const result = layoutTable({
    pageTemplate: {
      ...pageTemplate,
      width: 820.06,
      height: 800.9,
      margins: { top: 700, left: 700, right: 0, bottom: 0 },
    },
    table: fractional,
  });
  assert.equal(result.pageCount, 1);
  assert.ok(render(result.document).length > 0);
});
