/** @jsxImportSource @updf/core */
import { Document, Flow, Paragraph, Span, PageBreak, Block } from "@updf/layout";
import { floatable, textFlow } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
import { compositionOptions } from "./options.js";

export const siblingOptions = { ...compositionOptions(), extensions: [textFlow({ handlers: [pathShapes()] })] };
export const siblingFlow = { Block: floatable(Block) };
export const pathFlow = { Block: floatable(Block), Path: floatable(Path) };
export function siblingDocument(
  side: "left" | "right" = "left",
  before = 0,
  text = "Second paragraph has ordinary full width text. ".repeat(12),
) {
  return (
    <Document>
      <Flow pageSize={{ width: 220, height: 260 }} margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        {before > 0 && <Block style={{ height: before }} children={null} />}
        <siblingFlow.Block
          key="visual"
          style={{ width: 72, height: 96, float: side, backgroundColor: [0.2, 0.4, 0.6] }}
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
