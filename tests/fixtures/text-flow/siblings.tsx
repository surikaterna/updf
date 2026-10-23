/** @jsxImportSource @updf/core */
import { Document, Flow, Paragraph, Span, PageBreak, Block } from "@updf/layout";
import { createTextFlow } from "@updf/text-flow";
import { createPathTextFlow } from "@updf/text-flow/path";
import { compositionOptions } from "./options.js";

export const siblingOptions = compositionOptions();
export const siblingFlow = createTextFlow(siblingOptions.capability);
export const pathFlow = createPathTextFlow(siblingOptions.capability);
export function siblingDocument(
  side: "left" | "right" = "left",
  before = 0,
  text = "Second paragraph has ordinary full width text. ".repeat(12),
) {
  return (
    <Document>
      <Flow
        pageSize={{ width: 220, height: 260 }}
        margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
        participation={siblingFlow.participation}
      >
        {before > 0 && <Block style={{ height: before }} children={null} />}
        <siblingFlow.Block
          key="visual"
          style={{ width: 72, height: 96, float: side, shapeOutside: "rect", backgroundColor: [0.2, 0.4, 0.6] }}
        />
        <Paragraph key="first">
          Rich <Span style={{ color: [1, 0, 0], backgroundColor: [0.9, 0.9, 0.2] }}>styled span</Span> and first
          paragraph.
        </Paragraph>
        <Paragraph key="second">{text}</Paragraph>
        <PageBreak />
        <Paragraph key="after">After page break.</Paragraph>
      </Flow>
    </Document>
  );
}
