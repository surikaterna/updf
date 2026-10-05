/** @jsxImportSource @updf/core */

import { Block, createExtensions, Document, Flow, Paragraph, Span } from "@updf/layout";
import {
  type CellStyle,
  type RowStyle,
  Table,
  type TableInput,
  type TableStyle,
  table,
  tableExtension,
} from "@updf/tables";
import { layout } from "./layout-options.js";
import { lower, render } from "./text-options.js";

const columns = [
  { width: { weight: 2, min: 80, max: 140 }, style: { borderLeft: { width: 2, color: [0, 0, 1] } } },
  { width: 60 },
] as const;
const extensions = createExtensions([tableExtension]);
const base: TableStyle = { fontSize: 10, lineHeight: 1.2, padding: 4, backgroundColor: [0.9, 0.96, 1], border: null };
const rowStyle: RowStyle = {
  padding: 3,
  paddingTop: 4,
  color: [0, 0, 1],
  borderBottom: { width: 2, color: [0, 0, 1] },
};
const cellStyle: CellStyle = {
  paddingLeft: 6,
  backgroundColor: [1, 1, 0],
  borderRight: { width: 0, color: [0, 0, 0] },
};
const data = {
  columns,
  style: base,
  head: { repeat: true, rows: [{ cells: [{ children: "Description" }, { children: "Count" }] }] },
  body: [{ style: rowStyle, keepTogether: true, cells: [{ style: cellStyle, children: "Item" }, { children: 1 }] }],
  foot: { rows: [{ cells: [{ children: "Totals" }, { children: 1 }] }] },
} as const satisfies TableInput;
const content = (
  <Document>
    <Flow
      pageSize={{ width: 200, height: 100 }}
      margins={{ top: 5, right: 5, bottom: 5, left: 5 }}
      extensions={extensions}
    >
      <Table columns={columns} style={base}>
        <Table.Head repeat>
          <Table.Row>
            <Table.HeaderCell>Description</Table.HeaderCell>
            <Table.HeaderCell>Count</Table.HeaderCell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Row keepTogether style={rowStyle}>
            <Table.Cell style={cellStyle}>
              <Block style={{ paddingTop: 1 }}>
                <Paragraph style={{ fontSize: 12 }}>
                  Item<Span style={{ color: [1, 0, 0] }}>!</Span>
                </Paragraph>
              </Block>
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
  // @ts-expect-error Columns require point widths or weighted tracks, not CSS strings.
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
  // @ts-expect-error Row defaults are role-aware, not arbitrary paragraph props.
  const childStyle: RowStyle = { children: "text" };
  // @ts-expect-error Border colors require RGB, not CSS strings.
  const borderStyle: CellStyle = { border: { width: 1, color: "red" } };
  // @ts-expect-error No compatibility background alias.
  const oldStyle: TableStyle = { background: [1, 1, 0] };
  void [childStyle, borderStyle, oldStyle];
  // @ts-expect-error Table defaults do not inherit Block auto margins.
  const autoTable: TableStyle = { marginTop: "auto" };
  // @ts-expect-error Table row defaults do not inherit Block auto margins.
  const autoRow: RowStyle = { marginTop: "auto" };
  // @ts-expect-error Table cells do not inherit Block auto margins.
  const autoCell: CellStyle = { marginTop: "auto" };
  // @ts-expect-error Table column defaults do not inherit Block auto margins.
  table({ columns: [{ width: 20, style: { marginTop: "auto" } }], body: [] });
  void [autoTable, autoRow, autoCell];
}
