import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { createExtensions, document, flow, PageBreak } from "@updf/layout";
import { Table, table, tableExtension } from "@updf/tables";
import { layout } from "../fixtures/text-options.js";

test("PageBreak and native data reject in closed table cells with the same diagnostic contract", () => {
  const extensions = createExtensions([tableExtension]);
  const columns = [{ width: 80 }];
  const run = (children: Parameters<typeof flow>[0]["children"]) =>
    layout(
      document({
        children: flow({
          pageSize: { width: 100, height: 100 },
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          extensions,
          children: children ?? [],
        }),
      }),
    );
  const codes: string[] = [];
  for (const item of [{ type: "pageBreak" as const }, h(PageBreak, {})]) {
    for (const content of [
      table({ columns, body: [{ cells: [{ children: item, style: { height: 40 } }] }] }),
      h(Table, {
        columns,
        children: h(Table.Body, {
          children: h(Table.Row, { children: h(Table.Cell, { children: item, style: { height: 40 } }) }),
        }),
      }),
    ]) {
      assert.throws(
        () => run(content),
        (error: unknown) => {
          if (!(error instanceof DocumentError)) return false;
          const diagnostic = error.diagnostics[0];
          assert.ok(diagnostic);
          assert.match(diagnostic.path, /\/document\/children/u);
          codes.push(diagnostic.code);
          return true;
        },
      );
    }
  }
  assert.deepEqual(codes, Array(4).fill("TYPE"));
});
