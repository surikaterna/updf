/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { createExtensions, Document, document, Flow, flow, layout } from "@updf/layout";
import { Table, type TableInput, table, tableExtension } from "@updf/tables";

const input: TableInput = {
  columns: [{ width: 100 }],
  style: { defaultStyle: { fontSize: 10 }, lineHeight: 12, padding: 0 },
  body: [{ keepTogether: true, cells: [{ children: "Packed tables" }] }],
};
const pageSize = { width: 100, height: 100 };
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const extensions = createExtensions([tableExtension]);
const data = render(
  layout(document({ children: flow({ pageSize, margins, extensions, children: table(input) }) })).document,
);
const tsx = render(
  lower(
    <Document>
      <Flow pageSize={pageSize} margins={margins} extensions={extensions}>
        <Table columns={input.columns} style={input.style!}>
          <Table.Body>
            <Table.Row keepTogether>
              <Table.Cell>Packed tables</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Flow>
    </Document>,
  ),
);
if (data.length !== tsx.length || data.some((byte, index) => byte !== tsx[index])) throw new Error("Tables parity");
// @ts-expect-error No percentages or implicit sizing.
const invalid: TableInput["columns"] = [{ width: "100%" }];
void invalid;

// @ts-expect-error Tables remain a separate package, not layout exports.
import type { TableDefinition as RootTable } from "@updf/layout";
export type RejectedRoot = RootTable;
