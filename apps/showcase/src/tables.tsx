/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import {
  type BlockAdapterIdentity,
  type BlockContent,
  blockComponent,
  createExtensions,
  Document,
  Flow,
  type InlineAdapterIdentity,
  layout,
  Paragraph,
} from "@updf/layout";
import { Table, tableExtension } from "@updf/tables";
import { chartAdapter } from "./chart.js";

export interface TableControls {
  readonly count: number;
  readonly preset: "compact" | "wide" | "overflow";
  readonly repeatHeader: boolean;
  readonly wrapped: boolean;
  readonly cellPreset?: "text" | "chart" | "svg";
  readonly minHeight?: number;
}
export const tableDefaults: TableControls = {
  count: 12,
  preset: "compact",
  repeatHeader: true,
  wrapped: true,
  cellPreset: "text",
  minHeight: 0,
};
export interface TableVisual {
  readonly content: (index: number) => BlockContent;
  readonly adapters: readonly (BlockAdapterIdentity | InlineAdapterIdentity)[];
}
const Chart = blockComponent(chartAdapter);
export function tableDefinition(title: string, controls: TableControls = tableDefaults, visual?: TableVisual) {
  if (!Number.isInteger(controls.count) || controls.count < 1 || controls.count > 40)
    throw new Error("Row count must be 1–40");
  if (!["compact", "wide", "overflow"].includes(controls.preset)) throw new Error("Unknown table preset");
  if (!["text", "chart", "svg"].includes(controls.cellPreset ?? "text")) throw new Error("Unknown cell preset");
  if (!Number.isFinite(controls.minHeight ?? 0) || (controls.minHeight ?? 0) < 0 || (controls.minHeight ?? 0) > 100)
    throw new Error("Minimum row height must be 0–100");
  const wide = controls.preset === "wide";
  const columns = [{ width: wide ? 270 : 140 }, { width: wide ? 118 : 68, style: { align: "right" as const } }];
  return (
    <Document>
      <Flow
        pageSize={{ width: wide ? 420 : 240, height: 240 }}
        margins={{ top: 16, right: 16, bottom: 16, left: 16 }}
        extensions={createExtensions([tableExtension, chartAdapter, ...(visual?.adapters ?? [])])}
      >
        <Paragraph lineHeight={14}>{title}</Paragraph>
        <Table
          columns={columns}
          style={{ padding: 4, lineHeight: 14, whiteSpace: "preserve", breakLongWords: "codePoint" }}
          grid={{ width: 1, color: [0.2, 0.3, 0.4] }}
        >
          <Table.Head repeat={controls.repeatHeader}>
            <Table.Row>
              <Table.HeaderCell style={{ background: [0.85, 0.92, 1] }}>Inventory item</Table.HeaderCell>
              <Table.HeaderCell style={{ background: [0.85, 0.92, 1] }}>Count</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>{inventoryRows(controls, visual)}</Table.Body>
          <Table.Foot>
            <Table.Row>
              <Table.Cell>Inventory totals</Table.Cell>
              <Table.Cell>{String(controls.count)}</Table.Cell>
            </Table.Row>
          </Table.Foot>
        </Table>
        <Paragraph lineHeight={14}>End of inventory</Paragraph>
      </Flow>
    </Document>
  );
}
function inventoryRows(controls: TableControls, visual?: TableVisual) {
  const items = Array.from({ length: controls.count }, (_, index) => ({ id: `item-${index + 1}`, number: index + 1 }));
  return items.map((item) => (
    <Table.Row
      key={item.id}
      keepTogether
      minHeight={controls.preset === "overflow" && item.number === 1 ? 240 : (controls.minHeight ?? 0)}
    >
      <Table.Cell>
        <Paragraph>{`Item ${item.number}`}</Paragraph>
        {controls.wrapped && <Paragraph>Wrapped description</Paragraph>}
        {controls.cellPreset === "chart" && <Chart height={40} values={[0.2, 0.6, 0.9]} />}
        {controls.cellPreset === "svg" && visual ? visual.content(item.number) : null}
      </Table.Cell>
      <Table.Cell>{String(item.number * 3)}</Table.Cell>
    </Table.Row>
  ));
}
export function tableExample(title: string, controls: TableControls = tableDefaults, visual?: TableVisual) {
  const result = layout(tableDefinition(title, controls, visual));
  const tablePlacements = result.placements.filter((placement) => placement.sourceIndex === 1);
  const consumedRows = tablePlacements.reduce(
    (sum, placement) => sum + (placement.sourceRange ? placement.sourceRange.end - placement.sourceRange.start : 0),
    0,
  );
  return {
    bytes: render(result.document),
    result: {
      ...result,
      consumedBodyRowCount: consumedRows,
      repeatedHeaderCount: controls.repeatHeader ? Math.max(0, tablePlacements.length - 1) : 0,
    },
  };
}
