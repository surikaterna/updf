/** @jsxImportSource @updf/core */

import { Document, document, Flow, flow, PageBreak, type PageBreakProps, paragraph } from "@updf/layout";
import { layout } from "./layout-options.js";
import { lower, render } from "./text-options.js";

const pageSize = { width: 100, height: 40 };
const margins = { top: 0, right: 0, bottom: 0, left: 0 };
const props: PageBreakProps = {};
const content = paragraph({ children: "consumer" });
const tree = (
  <Document>
    <Flow pageSize={pageSize} margins={margins}>
      <PageBreak {...props} />
      {content}
      <PageBreak />
      <PageBreak />
    </Flow>
  </Document>
);
const data = layout(
  document({
    children: flow({
      pageSize,
      margins,
      children: [{ type: "pageBreak" }, content, { type: "pageBreak" }, { type: "pageBreak" }],
    }),
  }),
);
const bytes = render(lower(tree));
const expected = render(data.document);
if (data.pageCount !== 4 || bytes.length !== expected.length || bytes.some((byte, i) => byte !== expected[i]))
  throw new Error("PageBreak native/data parity");
if (!bytes.length) {
  // @ts-expect-error PageBreak is a leaf.
  const children = <PageBreak>text</PageBreak>;
  // @ts-expect-error No style/CSS break system.
  const style = <PageBreak style={{}} />;
  // @ts-expect-error Present undefined props are not supported.
  const undefinedChild = <PageBreak children={undefined} />;
  // @ts-expect-error Unknown props reject.
  const unknown = <PageBreak unknown={true} />;
  void [children, style, undefinedChild, unknown];
}
