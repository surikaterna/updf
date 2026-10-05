import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h, useContext } from "@updf/core/vdom";
import { Table, table, tableExtension } from "@updf/tables";
import { render } from "../../../tests/fixtures/text-options.js";
import {
  block,
  createExtensions,
  Document,
  Flow,
  layout,
  layoutFlow,
  PageContext,
} from "../../../tests/fixtures/transitional-layout.js";
import { bands, base, blue, geometry, red, row, run } from "./border-fixtures.js";

for (const scale of [0.000001, 0.1, 1000000]) {
  for (const deferred of [false, true]) {
    test(`#42-B2 explicit shared coordinates retain native-scale geometry at nonzero origins scale=${scale} deferred=${deferred}`, () => {
      const edge = { ...red, width: 4 * scale };
      const cells = [{}, {}];
      const result = layoutFlow(
        {
          pageTemplate: {
            width: 100 * scale,
            height: 100 * scale,
            margins: { top: 10 * scale, right: 10 * scale, bottom: 10 * scale, left: 10 * scale },
          },
          body: [
            table({
              columns: [{ width: 40 * scale }, { width: 40 * scale }],
              style: { padding: 0, fontSize: scale, lineHeight: { unit: "pt", value: 2 * scale } },
              grid: { width: 2 * scale, color: [0, 0, 0] },
              head: {
                rows: [{ minHeight: 20 * scale, cells, style: { borderBottom: edge } }],
                ...(deferred ? { height: 20 * scale } : {}),
              },
              body: [{ minHeight: 20 * scale, cells, style: { borderTop: { ...blue, width: 4 * scale } } }],
            }),
          ],
        },
        {},
        createExtensions([tableExtension]),
      );
      const values = bands(result.document.pages[0]!.children).filter((value) => value.color[0] === 1);
      assert.equal(values.length, 1);
      const band = values[0]!;
      assert.equal(band.x, 10 * scale);
      const low = 20 * scale - edge.width / 2;
      const high = 20 * scale + edge.width / 2;
      assert.equal(band.y, 10 * scale + low);
      assert.equal(band.width, 80 * scale);
      assert.equal(band.height, high - low);
      assert.ok(render(result.document).length);
    });
  }
}

for (const headDeferred of [false, true])
  for (const footDeferred of [false, true])
    for (const repeat of [false, true]) {
      test(`#42-B2 final mixed seams and fragment outer edges head=${headDeferred} foot=${footDeferred} repeat=${repeat}`, () => {
        const result = run(
          {
            ...base,
            head: { repeat, rows: [{ ...row, style: { borderBottom: red } }], ...(headDeferred ? { height: 20 } : {}) },
            foot: { repeat, rows: [{ ...row, style: { borderTop: blue } }], ...(footDeferred ? { height: 20 } : {}) },
            body: Array.from({ length: 5 }, () => ({ ...row, style: { borderTop: blue, borderBottom: red } })),
          },
          80,
        );
        assert.ok(result.pageCount > 1);
        for (const [index, page] of result.document.pages.entries()) {
          const values = bands(page.children).filter((value) => value.width > value.height);
          const head = repeat || index === 0,
            foot = repeat || index === result.pageCount - 1;
          assert.deepEqual(geometry(values[0]!), head ? [12, 11, 76, 2, [0, 0, 0]] : [10, 10, 80, 4, blue.color]);
          const height = result.placements[index]!.box.height;
          assert.deepEqual(
            geometry(values.at(-1)!),
            foot ? [12, 10 + height - 3, 76, 2, [0, 0, 0]] : [10, 10 + height - 4, 80, 4, red.color],
          );
          for (const value of values.slice(1, -1)) {
            assert.deepEqual(value.color, red.color);
            assert.equal(values.filter((other) => other.y === value.y).length, 1);
          }
        }
        assert.ok(render(result.document).length);
      });
    }
function pageHead(seen: number[]) {
  const page = useContext(PageContext).docPageNumber;
  seen.push(page);
  return h(Table.Row, {
    minHeight: 20,
    style: { borderBottom: { width: page + 2, color: [1, 0, 0] }, padding: 0 },
    children: [h(Table.Cell, {}), h(Table.Cell, {})],
  });
}
test("#42-B2 deferred page-dependent row styles participate only after sealing, without neighbor reflow", () => {
  const seen: number[] = [];
  function Head() {
    return pageHead(seen);
  }
  const result = layout(
    h(Document, {
      children: h(Flow, {
        pageSize: { width: 100, height: 80 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        extensions: createExtensions([tableExtension]),
        children: h(Table, {
          columns: base.columns,
          grid: { width: 2, color: [0, 0, 0] },
          style: { padding: 0 },
          children: [
            h(Table.Head, { height: 20, repeat: true, children: h(Head, {}) }),
            h(Table.Body, {
              children: Array.from({ length: 5 }, (_, index) =>
                h(Table.Row, { minHeight: 20, children: [h(Table.Cell, {}), h(Table.Cell, {})] }, index),
              ),
            }),
          ],
        }),
      }),
    }),
  );
  assert.deepEqual(seen, [1, 2, 3]);
  assert.deepEqual(
    result.placements.map((placement) => placement.sourceRange),
    [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
      { start: 4, end: 5 },
    ],
  );
  for (const [index, page] of result.document.pages.entries())
    assert.deepEqual(
      bands(page.children)
        .filter((value) => value.color[0] === 1)
        .map(geometry),
      [[10, 30 - (index + 3) / 2, 80, index + 3, red.color]],
    );
});
test("#42-B2 short reserved sections keep gaps; explicit clipped edges do not invent a cut border", () => {
  const result = run({ ...base, style: { padding: 0, border: red }, head: { height: 30, rows: [row] } });
  assert.deepEqual(
    bands(result.document.pages[0]!.children)
      .filter((value) => value.width > value.height)
      .map(geometry),
    [
      [10, 10, 80, 4, red.color],
      [10, 26, 80, 4, red.color],
      [10, 40, 80, 4, red.color],
      [10, 56, 80, 4, red.color],
    ],
  );
  const clipped = layoutFlow(
    {
      pageTemplate: { width: 100, height: 100, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [
        block({
          style: { height: 30, overflow: "hidden" },
          children: [
            table({
              ...base,
              style: { padding: 0, border: red, backgroundColor: [0, 1, 0] },
              body: [{ ...row, minHeight: 40 }],
            }),
          ],
        }),
      ],
    },
    {},
    createExtensions([tableExtension]),
  );
  const values = bands(clipped.document.pages[0]!.children);
  assert.deepEqual(
    values.slice(0, 2).map((value) => value.color),
    [
      [0, 1, 0],
      [0, 1, 0],
    ],
  );
  assert.deepEqual(
    values.filter((value) => value.width > value.height && value.height === 4).map((value) => value.y),
    [10, 46],
  );
});
test("#42-B2 JSX invalid overridden row borders retain authored origins before cell callbacks", () => {
  let calls = 0;
  function Content() {
    calls++;
    return "OK";
  }
  for (const Slot of [Table.Body, Table.Head, Table.Foot]) {
    for (const deferred of [false, true]) {
      if (Slot === Table.Body && deferred) continue;
      const content = h(Table, {
        columns: base.columns,
        children: h(Slot, {
          ...(deferred ? { height: 20 } : {}),
          children: h(Table.Row, {
            style: { border: { width: NaN, color: [0, 0, 0] } },
            children: [h(Table.Cell, { style: { border: null }, children: h(Content, {}) }), h(Table.Cell, {})],
          }),
        }),
      });
      assert.throws(
        () =>
          layout(
            h(Document, {
              children: h(Flow, {
                pageSize: { width: 100, height: 100 },
                margins: { top: 0, right: 0, bottom: 0, left: 0 },
                extensions: createExtensions([tableExtension]),
                children: content,
              }),
            }),
          ),
        (error: unknown) => {
          if (!(error instanceof DocumentError)) return false;
          assert.equal(error.diagnostics[0]?.code, "GEOMETRY");
          assert.match(error.diagnostics[0]?.path ?? "", /\/children\/.*\/style\/border\/width$/u);
          assert.doesNotMatch(error.diagnostics[0]?.path ?? "", /\/props\/(body|head|foot)/u);
          return true;
        },
      );
    }
  }
  assert.equal(calls, 0);
});
