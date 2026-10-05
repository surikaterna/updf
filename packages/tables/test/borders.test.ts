import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { type CellStyle, table } from "@updf/tables";
import { render } from "../../../tests/fixtures/text-options.js";
import { block } from "../../../tests/fixtures/transitional-layout.js";
import { paragraphDefaults } from "../dist/measure.js";
import { bands, base, blue, geometry, red, row, run } from "./border-fixtures.js";

test("#42-B2 expands table/column/row/cell border layers before merging, independently of key order", () => {
  const result = run({
    ...base,
    style: { padding: 0, borderLeft: red },
    columns: [{ width: 40, style: { borderLeft: blue } }, { width: 40 }],
    body: [{ ...row, style: { border: null }, cells: [{ style: { borderBottom: red } }, {}] }],
  });
  assert.deepEqual(bands(result.document.pages[0]!.children).map(geometry), [[10, 26, 40, 4, red.color]]);
  const { grid: _grid, ...withoutGrid } = base;
  void _grid;
  for (const style of [
    { border: red, borderLeft: null },
    { borderLeft: null, border: red },
  ]) {
    const values = bands(run({ ...withoutGrid, style: { padding: 0, ...style } }).document.pages[0]!.children);
    assert.equal(
      values.some((value) => value.width === 4 && value.x === 10),
      false,
    );
  }
});
test("#42-B2 border fields are cell-owner geometry, never paragraph defaults", () => {
  assert.deepEqual(
    paragraphDefaults({
      border: red,
      borderTop: null,
      borderRight: blue,
      borderBottom: red,
      borderLeft: null,
      fontSize: 9,
    }),
    { style: { fontSize: 9 } },
  );
});
test("#42-B2 validates all overridden layers including unused columns and authored diagnostic paths", () => {
  for (const bad of [
    undefined,
    { width: -1, color: [0, 0, 0] },
    { width: NaN, color: [0, 0, 0] },
    { width: Infinity, color: [0, 0, 0] },
    { width: 1, color: [0, 2, 0] },
    { width: 1, color: [0, 0] },
    { width: 1, color: [0, 0, 0], extra: true },
  ]) {
    const style = { border: bad } as unknown as CellStyle;
    const cases = [
      { input: { ...base, style, body: [] }, path: "/table/style/border" },
      {
        input: { ...base, columns: [{ width: 40, style }, { width: 40 }], body: [] },
        path: "/table/columns/0/style/border",
      },
      {
        input: { ...base, body: [{ ...row, style, cells: [{ style: { border: null } }, {}] }] },
        path: "/table/body/0/style/border",
      },
      { input: { ...base, body: [{ ...row, cells: [{ style }, {}] }] }, path: "/table/body/0/cells/0/style/border" },
    ];
    for (const { input, path } of cases)
      assert.throws(
        () => table(input),
        (error: unknown) => error instanceof DocumentError && !!error.diagnostics[0]?.path.startsWith(path),
      );
  }
});
for (const opposite of [null, { ...blue, width: 0 }, blue, { ...blue, width: 6 }]) {
  test(`#42-B2 vertical conflict explicit-positive vs ${JSON.stringify(opposite)}`, () => {
    const result = run({
      ...base,
      body: [{ ...row, cells: [{ style: { borderRight: red } }, { style: { borderLeft: opposite } }] }],
    });
    const values = bands(result.document.pages[0]!.children).filter(
      (value) => value.x <= 50 && value.x + value.width > 50 && value.width < value.height,
    );
    const winner = opposite && opposite.width > 4 ? opposite : red;
    assert.deepEqual(values.map(geometry), [[50 - winner.width / 2, 12, winner.width, 16, winner.color]]);
  });
}
test("#42-B2 explicit positive beats a thicker grid; null and width zero suppress fallback only without positives", () => {
  for (const edge of [null, { ...red, width: 0 }, { ...red, width: 1 }]) {
    const result = run({
      ...base,
      grid: { ...blue, width: 6 },
      body: [{ ...row, cells: [{ style: { borderRight: edge } }, {}] }],
    });
    const values = bands(result.document.pages[0]!.children).filter(
      (value) => value.width < value.height && value.x > 20 && value.x < 70,
    );
    assert.deepEqual(values.map(geometry), edge?.width ? [[49.5, 16, 1, 10, red.color]] : []);
  }
});
test("#42-B2 horizontal ties use upper bottom regardless of opposing paint order", () => {
  const result = run({
    ...base,
    body: [
      { ...row, style: { borderBottom: red } },
      { ...row, style: { borderTop: blue } },
    ],
  });
  assert.deepEqual(
    bands(result.document.pages[0]!.children)
      .filter((value) => value.y === 28)
      .map(geometry),
    [[10, 28, 80, 4, red.color]],
  );
});
test("#42-B2 bottom-only totals and asymmetric outer boxes stay inside allocations with horizontal corner ownership", () => {
  const totals = run({ ...base, style: { padding: 0, border: null, borderBottom: red } });
  assert.deepEqual(bands(totals.document.pages[0]!.children).map(geometry), [[10, 26, 80, 4, red.color]]);
  const framed = run({
    columns: [{ width: 80 }],
    style: {
      padding: 0,
      borderTop: red,
      borderBottom: { ...blue, width: 6 },
      borderLeft: { ...red, width: 2 },
      borderRight: { ...blue, width: 8 },
    },
    body: [{ minHeight: 30, cells: [{}] }],
  });
  assert.deepEqual(bands(framed.document.pages[0]!.children).map(geometry), [
    [10, 10, 80, 4, red.color],
    [10, 34, 80, 6, blue.color],
    [10, 14, 2, 20, red.color],
    [82, 14, 8, 20, blue.color],
  ]);
});
test("#42-B2 suppressed sides of a zero-content-height bottom-only cell keep logical identity without paint trims", () => {
  const result = run({
    columns: [{ width: 80 }],
    style: { padding: 0, height: 0, overflow: "hidden", border: null, borderBottom: red },
    body: [{ cells: [{ children: block({ children: [] }) }] }],
  });
  assert.equal(result.placements[0]?.box.height, 4);
  assert.deepEqual(bands(result.document.pages[0]!.children).map(geometry), [[10, 10, 80, 4, red.color]]);
  assert.ok(render(result.document).length);
});
test("#42-B2 content measurement reserves only the cell's own effective edge widths, not the opposing winner", () => {
  const result = run({
    ...base,
    style: { padding: 0 },
    body: [
      {
        cells: [
          { children: "A", style: { borderRight: null } },
          { children: "B", style: { borderLeft: { ...blue, width: 10 } } },
        ],
      },
    ],
  });
  const pdf = new TextDecoder().decode(render(result.document));
  assert.match(pdf, /1 0 0 1 2 2 cm/u);
  assert.match(pdf, /1 0 0 1 50 2 cm/u);
  assert.equal(result.placements[0]!.box.height, 14);
});
test("#42-B2 nonrepresentable/oversized insets and aggregate claims enforce native geometry and operation limits", () => {
  assert.throws(() => run({ ...base, style: { borderLeft: { ...red, width: 40 } } }), DocumentError);
  assert.throws(() => run({ ...base, style: { borderBottom: { ...red, width: Number.MIN_VALUE } } }), DocumentError);
  assert.throws(
    () => run(base, 100, { limits: { nodes: 3 } }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LIMIT",
  );
});
