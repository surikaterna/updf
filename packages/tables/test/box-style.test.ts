import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { block, createExtensions, document, flow, paragraph, span } from "@updf/layout";
import { Table, table, tableExtension } from "@updf/tables";
import { layout, measure, render } from "../../../tests/fixtures/text-options.js";

const extensions = createExtensions([tableExtension]);
function placed(content: ReturnType<typeof table>) {
  return layout(
    document({
      children: flow({
        pageSize: { width: 200, height: 200 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        extensions,
        children: content,
      }),
    }),
  );
}

test("#49-C expands shorthand per layer before table-column-row-cell merge", () => {
  const content = table({
    columns: [{ width: 100, style: { paddingLeft: 9, paddingTop: 10 } }],
    style: { padding: 2, paddingBottom: 11 },
    body: [{ style: { padding: 3, paddingTop: 4 }, cells: [{ style: { paddingBottom: 5 }, children: "A" }] }],
  });
  const result = placed(content);
  assert.equal(result.placements[0]!.box.height, 19);
  assert.equal(measure(content, { width: 100 }, { extensions }).size.height, 19);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.match(pdf, /1 0 0 1 3 /u);
  for (const style of [
    { padding: 3, paddingTop: 4 },
    { paddingTop: 4, padding: 3 },
  ]) {
    const same = table({ columns: [{ width: 100 }], body: [{ style, cells: [{ children: "A" }] }] });
    assert.equal(measure(same, { width: 100 }, { extensions }).size.height, 17);
  }
});

test("#49-C merges each text property through row, explicit paragraph and nested span", () => {
  const content = table({
    columns: [{ width: 100, style: { fontSize: 12, color: [1, 0, 0] } }],
    style: { font: "Helvetica", fontSize: 10, lineHeight: 1.2, color: [0, 0, 0], padding: 6 },
    body: [
      {
        style: { fontSize: 14, color: [0, 1, 0] },
        cells: [
          {
            style: { color: [0, 0, 1] },
            children: paragraph({
              style: { fontSize: 16 },
              children: ["A", span({ style: { fontSize: 20 }, children: "B" })],
            }),
          },
        ],
      },
    ],
  });
  const result = placed(content);
  assert.ok(Math.abs(result.placements[0]!.box.height - 36) < 1e-12);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.match(pdf, /16 Tf/u);
  assert.match(pdf, /20 Tf/u);
  assert.equal((pdf.match(/0 0 1 rg/gu) ?? []).length, 2);
  assert.doesNotMatch(pdf, /0 1 0 rg|1 0 0 rg/u);
});

test("#49-C box defaults apply to cell owners, not nested Blocks, and row backgrounds compose per key", () => {
  const content = table({
    columns: [{ width: 100 }],
    style: { padding: 2, backgroundColor: [1, 0, 0] },
    body: [
      {
        style: { backgroundColor: [0, 1, 0] },
        cells: [
          {
            style: { backgroundColor: [0, 0, 1] },
            children: block({ children: [paragraph({ children: "A" })] }),
          },
        ],
      },
    ],
  });
  const result = placed(content);
  assert.equal(result.placements[0]!.box.height, 14);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.equal((pdf.match(/0 0 1 rg/gu) ?? []).length, 1);
  assert.doesNotMatch(pdf, /0 1 0 rg|1 0 0 rg/u);
});

test("#49-C validates row defaults even overridden or empty; unsupported box/text keys reject", () => {
  for (const style of [
    { paddingTop: undefined },
    { padding: -1 },
    { background: [0, 0, 0] },
    { paddingRight: NaN },
    { backgroundColor: [0, 2, 0] },
    { border: { width: 1, color: "black" } },
    { fontSize: Infinity },
    { lineHeight: undefined },
    { padding: "2pt" },
  ]) {
    assert.throws(() => table({ columns: [{ width: 100 }], body: [{ style, cells: [{}] }] } as never), DocumentError);
  }
  assert.throws(
    () =>
      placed(
        table({
          columns: [{ width: 100 }],
          body: [
            {
              style: { font: "missing" },
              cells: [{ style: { font: "Helvetica" }, children: "A" }],
            },
          ],
        }),
      ),
    DocumentError,
  );
});

test("#49-C row JSX and data agree; same-key source order and implicit text inheritance are explicit", () => {
  const base = { fontSize: 12, color: [1, 0, 0] as const, padding: 2 };
  const override = { fontSize: 16, color: [0, 0, 1] as const };
  for (const style of [
    { ...base, ...override },
    { ...override, ...base },
  ]) {
    const data = table({ columns: [{ width: 100 }], body: [{ style, cells: [{ children: "A" }] }] });
    const jsx = h(Table, {
      columns: [{ width: 100 }],
      children: h(Table.Body, { children: h(Table.Row, { style, children: h(Table.Cell, { children: "A" }) }) }),
    });
    const metrics = measure(data, { width: 100 }, { extensions });
    assert.equal(metrics.size.height, style.fontSize + 4);
    assert.deepEqual(measure(jsx, { width: 100 }, { extensions }), metrics);
    const rendered = placed(data);
    const jsxLayout = layout(
      document({
        children: flow({
          pageSize: { width: 200, height: 200 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          extensions,
          children: jsx,
        }),
      }),
    );
    assert.deepEqual(render(jsxLayout.document), render(rendered.document));
  }
});
