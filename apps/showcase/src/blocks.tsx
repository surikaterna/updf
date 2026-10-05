/** @jsxImportSource @updf/core */

import { Block, blockComponent, createExtensions, Document, Flow, Paragraph, pageSize } from "@updf/layout";
import { chartAdapter } from "./chart.js";
import { layout } from "./layout-options.js";
import { render } from "./text-options.js";

export interface BlockControls {
  readonly chartHeight: number;
  readonly blockHeight: number;
  readonly keepTogether: boolean;
  readonly hidden: boolean;
}
export const blockDefaults: BlockControls = { chartHeight: 80, blockHeight: 0, keepTogether: false, hidden: false };
const Chart = blockComponent(chartAdapter);
export function blockExample(title: string, controls: BlockControls = blockDefaults) {
  if (!Number.isInteger(controls.chartHeight) || controls.chartHeight < 40 || controls.chartHeight > 180)
    throw new Error("Chart height must be 40–180 (bounded showcase control, not a core limit)");
  if (!Number.isInteger(controls.blockHeight) || controls.blockHeight < 0 || controls.blockHeight > 220)
    throw new Error("Block height must be 0–220; zero means natural height in this form");
  const result = layout(blockDocument(title, controls));
  return { bytes: render(result.document), result, controls, authoredBodyBlockCount: 3 };
}
function blockDocument(title: string, controls: BlockControls) {
  return (
    <Document>
      <Flow
        pageSize={pageSize(240, 180)}
        margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
        extensions={createExtensions([chartAdapter])}
      >
        <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>{`Before: ${title}`}</Paragraph>
        <Block
          keepTogether={controls.keepTogether}
          style={{
            ...(controls.blockHeight ? { height: controls.blockHeight } : {}),
            overflow: controls.hidden ? "hidden" : "error",
            padding: 6,
            border: { width: 2, color: [0, 0.6, 0] },
            gap: 4,
          }}
        >
          <Block.Header height={12} repeat={false}>
            <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>Static block header</Paragraph>
          </Block.Header>
          <Block keepTogether style={{ gap: 4 }}>
            <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>Headline and chart</Paragraph>
            <Chart height={controls.chartHeight} values={[0.2, 0.6, 0.9]} />
          </Block>
          <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>Clipped text is still extractable.</Paragraph>
          <Block.Footer height={12} repeat={false}>
            <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>Static block footer</Paragraph>
          </Block.Footer>
        </Block>
        <Paragraph style={{ fontSize: 10, lineHeight: 1.2 }}>After the chart block.</Paragraph>
      </Flow>
    </Document>
  );
}
