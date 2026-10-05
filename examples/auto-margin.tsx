/** @jsxImportSource @updf/core */

import {
  Block,
  block,
  Document,
  document,
  Flow,
  flow,
  flowFooter,
  flowHeader,
  Paragraph,
  paragraph,
} from "@updf/layout";
import { layout, render } from "./text-options.js";

const margins = { top: 10, right: 10, bottom: 10, left: 10 };
const pageSize = { width: 120, height: 160 };
const text = (children: string) => paragraph({ children, style: { fontSize: 10, lineHeight: 1 } });

export function autoMarginData() {
  return document({
    children: flow({
      pageSize,
      margins,
      children: [
        flowHeader({ height: 12, children: text("HEADER") }),
        block({ style: { height: 30 }, children: [text("BODY")] }),
        block({ keepTogether: true, style: { height: 20, marginTop: "auto" }, children: [text("SUMMARY")] }),
        flowFooter({ height: 18, children: text("FOOTER") }),
      ],
    }),
  });
}

export function autoMarginTree() {
  return (
    <Document>
      <Flow pageSize={pageSize} margins={margins}>
        <Flow.Header height={12}>
          <Paragraph style={{ fontSize: 10, lineHeight: 1 }}>HEADER</Paragraph>
        </Flow.Header>
        <Block style={{ height: 30 }}>
          <Paragraph style={{ fontSize: 10, lineHeight: 1 }}>BODY</Paragraph>
        </Block>
        <Block keepTogether style={{ height: 20, marginTop: "auto" }}>
          <Paragraph style={{ fontSize: 10, lineHeight: 1 }}>SUMMARY</Paragraph>
        </Block>
        <Flow.Footer height={18}>
          <Paragraph style={{ fontSize: 10, lineHeight: 1 }}>FOOTER</Paragraph>
        </Flow.Footer>
      </Flow>
    </Document>
  );
}

/** Runnable by importing this function with tsx; no optional package is needed. */
export function autoMarginExample() {
  const result = layout(autoMarginTree());
  return { result, bytes: render(result.document) };
}
