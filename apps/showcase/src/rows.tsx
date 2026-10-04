/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import {
  Block,
  blockComponent,
  Column,
  createExtensions,
  Document,
  Flow,
  layout,
  Paragraph,
  Row,
  type RowAlignment,
} from "@updf/layout";
import { chartAdapter } from "./chart.js";
import { tableVisual } from "./optional-table-svg.js";

const Chart = blockComponent(chartAdapter);
export function rowExample(title: string, oversized = false) {
  const result = layout(
    <Document>
      <Flow
        pageSize={{ width: 360, height: 180 }}
        margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
        extensions={createExtensions([chartAdapter, ...tableVisual.adapters])}
      >
        <Paragraph>{title}</Paragraph>
        <Block style={{ height: 120 }}>
          <Paragraph>Atomic rows move to a fresh page; never truncate.</Paragraph>
        </Block>
        {(["top", "middle", "bottom", "stretch"] as const).map((align) => (
          <MixedRow align={align} oversized={oversized} />
        ))}
      </Flow>
    </Document>,
  );
  return { bytes: render(result.document), result };
}
function MixedRow({ align, oversized }: { readonly align: RowAlignment; readonly oversized: boolean }) {
  return (
    <Row align={align} style={{ gap: 6, padding: 2, border: { width: 1, color: [0, 0, 0] } }}>
      <Column
        width={72}
        style={{ padding: 3, border: { width: 1, color: [0.8, 0, 0] }, backgroundColor: [1, 0.9, 0.9] }}
      >
        <Paragraph>{align}</Paragraph>
        <Block style={{ height: 14, overflow: "hidden" }}>
          <Paragraph>Explicit clip only. Hidden text is not redacted.</Paragraph>
        </Block>
      </Column>
      <Column
        width={{ weight: 2, min: 120, max: 150 }}
        style={{ padding: 3, gap: 4, border: { width: 1, color: [0, 0.4, 0.8] } }}
      >
        <Paragraph>Measured chart and nested row</Paragraph>
        <Chart height={oversized ? 200 : 40} values={[0.2, 0.6, 0.9]} />
        <Row style={{ gap: 2 }}>
          <Column>
            <Paragraph>A</Paragraph>
          </Column>
          <Column>
            <Paragraph>B</Paragraph>
          </Column>
        </Row>
      </Column>
      <Column
        width={{ weight: 1, min: 60, max: 80 }}
        style={{ padding: 3, gap: 4, border: { width: 1, color: [0, 0.6, 0] } }}
      >
        <Paragraph>Native SVG</Paragraph>
        {tableVisual.content(0)}
      </Column>
    </Row>
  );
}
