import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { type CellProps, Table, table, tableExtension } from "@updf/tables";
import { createExtensions, Document, Flow, layout, layoutFlow } from "../../../tests/fixtures/transitional-layout.js";

const columns = [{ width: 180 }] as const;
const pageTemplate = { width: 200, height: 160, margins: { top: 5, right: 5, bottom: 5, left: 5 } };
const extensions = createExtensions([tableExtension]);
const failures: readonly { readonly code: string; readonly cell: CellProps }[] = [
  { code: "CHARACTER", cell: { children: "Ж" } },
  { code: "FONT_RESOURCE", cell: { children: "FONT", style: { defaultStyle: { font: "Missing" } } } },
  { code: "GEOMETRY", cell: { children: "BOX", style: { padding: 100 } } },
];
test("F-AUD03 multi-row static head/foot character, font and geometry paths name the section and row", () => {
  for (const name of ["head", "foot"] as const) {
    for (const failure of failures) {
      const input = table({
        columns,
        body: [{ cells: [{ children: "BODY" }] }],
        [name]: { rows: [{ cells: [{ children: "OK" }] }, { cells: [failure.cell] }] },
      });
      assert.throws(
        () => layoutFlow({ pageTemplate, body: [input] }, {}, extensions),
        (error: unknown) => {
          if (!(error instanceof DocumentError)) return false;
          const diagnostic = error.diagnostics[0];
          assert.equal(diagnostic?.code, failure.code);
          assert.ok(diagnostic?.path.startsWith(`/body/0/props/${name}/rows/1/cells/0/`), diagnostic?.path);
          assert.ok(!diagnostic?.path.includes("/props/rows/"));
          if (failure.code === "CHARACTER") assert.ok(diagnostic?.span);
          return true;
        },
      );
    }
  }
});
test("F-AUD03 JSX head/foot preserves the captured second-cell path for all error categories", () => {
  for (const Slot of [Table.Head, Table.Foot]) {
    for (const failure of failures) {
      const content = h(Document, {
        children: h(Flow, {
          pageSize: { width: 200, height: 160 },
          margins: pageTemplate.margins,
          extensions,
          children: h(Table, {
            columns,
            children: [
              h(Slot, {
                children: [
                  h(Table.Row, { children: h(Table.Cell, { children: "OK" }) }),
                  h(Table.Row, { children: h(Table.Cell, failure.cell) }),
                ],
              }),
              h(Table.Body, { children: h(Table.Row, { children: h(Table.Cell, { children: "BODY" }) }) }),
            ],
          }),
        }),
      });
      assert.throws(
        () => layout(content),
        (error: unknown) => {
          if (!(error instanceof DocumentError)) return false;
          assert.equal(error.diagnostics[0]?.code, failure.code);
          assert.match(error.diagnostics[0]?.path ?? "", /\/0\/children\/1\/children/u);
          assert.doesNotMatch(error.diagnostics[0]?.path ?? "", /\/props\/rows\//u);
          return true;
        },
      );
    }
  }
});
