/** @jsxImportSource @updf/core */
import { Document, Flow, Paragraph, Span, Block } from "@updf/layout";
import { pathFlow as f } from "./siblings.js";

export const sidePathData = "M0 0 H100 L20 96 H0 Z";
export function sidePathDocument(side: "left" | "right" = "left", before = 0) {
  return (
    <Document>
      <Flow
        pageSize={{ width: 220, height: 260 }}
        margins={{ top: 10, left: 10, right: 10, bottom: 10 }}
        participation={f.participation}
      >
        {before > 0 && <Block children={null} style={{ height: before }} />}
        <f.Path key="path" d={sidePathData} fill="#3498db" style={{ width: 100, height: 96, float: side }} />
        <Paragraph key="first">
          First <Span style={{ backgroundColor: [0.9, 0.9, 0.2] }}>styled source</Span> paragraph with contour text.
        </Paragraph>
        <Paragraph key="second">{"Second paragraph continues to full width. ".repeat(24)}</Paragraph>
      </Flow>
    </Document>
  );
}
