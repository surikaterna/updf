/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { createExtensions, Document, Flow, layout, Paragraph } from "@updf/layout";
import { Table, type TableInput, table, tableExtension } from "@updf/tables";

const columns = [{ width: 120 }, { width: 60 }] as const;
const extensions = createExtensions([tableExtension]);
const data = {
  columns,
  head: { repeat: true, rows: [{ cells: [{ children: "Description" }, { children: "Count" }] }] },
  body: [{ keepTogether: true, cells: [{ children: "Item" }, { children: 1 }] }],
  foot: { rows: [{ cells: [{ children: "Totals" }, { children: 1 }] }] },
} as const satisfies TableInput;
const content = (
  <Document>
    <Flow
      pageSize={{ width: 200, height: 100 }}
      margins={{ top: 5, right: 5, bottom: 5, left: 5 }}
      extensions={extensions}
    >
      <Table columns={columns}>
        <Table.Head repeat>
          <Table.Row>
            <Table.HeaderCell>Description</Table.HeaderCell>
            <Table.HeaderCell>Count</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row keepTogether>
            <Table.Cell>
              <Paragraph>Item</Paragraph>
            </Table.Cell>
            <Table.Cell>{"1"}</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Foot>
          <Table.Row>
            <Table.Cell>Totals</Table.Cell>
            <Table.Cell>{"1"}</Table.Cell>
          </Table.Row>
        </Table.Foot>
      </Table>
    </Flow>
  </Document>
);
const result = layout(content);
if (render(result.document).length !== render(lower(content)).length || !table(data))
  throw new Error("composable tables");
if (result.pageCount < 0) {
  // @ts-expect-error Columns require numeric explicit widths, not CSS strings.
  table({ columns: [{ width: "50%" }], body: [] });
  // @ts-expect-error Rows cannot opt into unsupported splitting.
  const split = <Table.Row keepTogether={false} />;
  void split;
  // @ts-expect-error Obsolete atomic is not a JSX alias.
  const obsolete = <Table.Row atomic />;
  void obsolete;
  // @ts-expect-error Obsolete atomic is not a data alias.
  table({ columns, body: [{ atomic: true, cells: [{}, {}] }] });
  // @ts-expect-error Data rows cannot opt into unsupported splitting.
  table({ columns, body: [{ keepTogether: false, cells: [{}, {}] }] });
  // @ts-expect-error Data rows are deeply readonly.
  data.body[0].cells.push({ children: "mutation" });
}
