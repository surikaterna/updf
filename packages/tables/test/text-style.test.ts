import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { createExtensions, document, flow, paragraph, pt, span } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";
import { layout, render } from "../../../tests/fixtures/text-options.js";

const extensions = createExtensions([tableExtension]);
test("#49-B text defaults preserve raw ratios through cells, paragraph overrides and shared descriptors", () => {
  const shared = paragraph({ children: span({ style: { fontSize: 20 }, children: "A" }) });
  const input = table({
    style: { fontSize: 12, lineHeight: 1.2, color: [0, 0, 1], padding: 4 },
    columns: [{ width: 100 }, { width: 100, style: { lineHeight: pt(16), color: [1, 0, 0] } }],
    body: [
      { cells: [{ children: shared }, { children: shared }] },
      { cells: [{ style: { lineHeight: pt(16) }, children: shared }, { children: shared }] },
    ],
  });
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 240, height: 100 },
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        extensions,
        children: input,
      }),
    }),
  );
  assert.ok(Math.abs(result.placements[0]!.box.height - 58.2) < 1e-12);
  const pdf = new TextDecoder().decode(render(result.document));
  assert.match(pdf, /0 0 1 rg/u);
  assert.match(pdf, /1 0 0 rg/u);
  assert.equal((pdf.match(/20 Tf/gu) ?? []).length, 4);
});
test("#49-B old table text defaults and explicit undefined cannot silently survive B plumbing", () => {
  for (const style of [
    { defaultStyle: { fontSize: 12 } },
    { align: "right" },
    { lineHeight: undefined },
    { fontSize: NaN },
  ])
    assert.throws(() => table({ columns: [{ width: 100 }], style, body: [] } as never), DocumentError);
});
