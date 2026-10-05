/** @jsxImportSource @updf/core */

import {
  Block,
  type BlockStyle,
  block,
  type ColumnStyle,
  Document,
  document,
  Flow,
  flow,
  Paragraph,
  type ParagraphStyle,
  paragraph,
  type RowStyle,
  type SpanStyle,
} from "@updf/layout";
import { layout } from "./layout-options.js";
import { render } from "./text-options.js";

const style: BlockStyle = { height: 20, marginTop: "auto" };
const tree = (
  <Document>
    <Flow pageSize={{ width: 100, height: 100 }} margins={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Block style={{ height: 30 }}>{null}</Block>
      <Block keepTogether style={style}>
        <Paragraph style={{ fontSize: 10, lineHeight: 1 }}>SUMMARY</Paragraph>
      </Block>
    </Flow>
  </Document>
);
const data = document({
  children: flow({
    pageSize: { width: 100, height: 100 },
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    children: [
      block({ style: { height: 30 }, children: [] }),
      block({
        keepTogether: true,
        style,
        children: [paragraph({ style: { fontSize: 10, lineHeight: 1 }, children: "SUMMARY" })],
      }),
    ],
  }),
});
const result = layout(tree);
if (result.placements[1]?.box.y !== 80) throw new Error("Packed auto-margin position");
if (JSON.stringify(layout(data)) !== JSON.stringify(result)) throw new Error("Packed auto-margin data/TSX parity");
if (!render(result.document).length) throw new Error("Packed auto-margin PDF");

if (result.pageCount < 0) {
  // @ts-expect-error Only the auto literal is supported.
  const numeric: BlockStyle = { marginTop: 10 };
  // @ts-expect-error Omit the field instead of setting undefined.
  const presentUndefined: BlockStyle = { marginTop: undefined };
  // @ts-expect-error Null is not an auto margin.
  const nullMargin: BlockStyle = { marginTop: null };
  // @ts-expect-error Rows do not inherit auto margins from BlockStyle.
  const row: RowStyle = { marginTop: "auto" };
  // @ts-expect-error Columns do not inherit auto margins from BlockStyle.
  const column: ColumnStyle = { marginTop: "auto" };
  // @ts-expect-error Paragraphs do not accept box margins.
  const paragraph: ParagraphStyle = { marginTop: "auto" };
  // @ts-expect-error Spans do not accept box margins.
  const span: SpanStyle = { marginTop: "auto" };
  void [numeric, presentUndefined, nullMargin, row, column, paragraph, span];
}
