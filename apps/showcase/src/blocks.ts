import { render } from "@updf/core";
import { block, createDecorationPlan, createExtensions, type FlowBlock, layoutFlow } from "@updf/layout";
import { chart, chartAdapter } from "./chart.js";

export interface BlockControls {
  readonly chartHeight: number;
  readonly blockHeight: number;
  readonly keepTogether: boolean;
  readonly hidden: boolean;
}
export const blockDefaults: BlockControls = { chartHeight: 80, blockHeight: 0, keepTogether: false, hidden: false };
function text(value: string): FlowBlock {
  return {
    type: "paragraph",
    paragraph: {
      runs: [{ text: value }],
      defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
      lineHeight: 12,
      align: "left",
      whiteSpace: "preserve",
      breakLongWords: "codePoint",
    },
  };
}
const region = (label: string) => [
  {
    type: "text" as const,
    x: 0,
    y: 0,
    width: 220,
    height: 12,
    text: label,
    fontSize: 10,
    lineHeight: 12,
    align: "left" as const,
  },
];
export function blockExample(title: string, controls: BlockControls = blockDefaults) {
  if (!Number.isInteger(controls.chartHeight) || controls.chartHeight < 40 || controls.chartHeight > 180)
    throw new Error("Chart height must be 40–180 (bounded showcase control, not a core limit)");
  if (!Number.isInteger(controls.blockHeight) || controls.blockHeight < 0 || controls.blockHeight > 220)
    throw new Error("Block height must be 0–220; zero means natural height in this form");
  const decorations = createDecorationPlan([
    { edge: "before", repeat: "first", height: 12, nodes: region("Static block header") },
    { edge: "after", repeat: "last", height: 12, nodes: region("Static block footer") },
  ]);
  const result = layoutFlow(
    {
      pageTemplate: { width: 240, height: 160, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [
        text(`Before: ${title}`),
        block({
          children: [
            chart({ height: controls.chartHeight, values: [0.2, 0.6, 0.9] }),
            text("Clipped text is still extractable."),
          ],
          keepTogether: controls.keepTogether,
          decorations,
          style: {
            ...(controls.blockHeight ? { height: controls.blockHeight } : {}),
            overflow: controls.hidden ? "hidden" : "error",
            padding: { top: 6, right: 6, bottom: 6, left: 6 },
            border: { width: 2, color: [0, 0.6, 0] },
            gap: 4,
          },
        }),
        text("After the chart block."),
      ],
    },
    {},
    createExtensions([chartAdapter]),
  );
  return { bytes: render(result.document), result, controls };
}
