/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { layoutTable, layoutTableFlow, type TableDocumentDefinition } from "@updf/layout/tables";
import { Tables } from "@updf/layout/tables/vdom";

const input: TableDocumentDefinition = {
  pageTemplate: { width: 100, height: 100, margins: { top: 0, right: 0, bottom: 0, left: 0 } },
  table: {
    type: "table",
    columns: [{ width: 100 }],
    align: "left",
    repeatHeader: true,
    defaults: {
      defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
      lineHeight: 12,
      align: "left",
      whiteSpace: "preserve",
      breakLongWords: "error",
      padding: 0,
    },
    rows: [{ cells: [{ paragraph: { runs: [{ text: "Packed tables" }] } }] }],
  },
};
const data = render(layoutTable(input).document);
const tsx = render(lower(<Tables.Document {...input} />));
if (data.length !== tsx.length || data.some((byte, index) => byte !== tsx[index])) throw new Error("Tables parity");
layoutTableFlow({ pageTemplate: input.pageTemplate, body: [input.table, { type: "spacer", height: 1 }] });
// @ts-expect-error No percentages or implicit sizing.
const invalid: TableDocumentDefinition["table"]["columns"] = [{ width: "100%" }];
void invalid;

// @ts-expect-error Tables must remain an optional entry, not root exports.
import type { TableDefinition as RootTable } from "@updf/layout";
export type RejectedRoot = RootTable;
