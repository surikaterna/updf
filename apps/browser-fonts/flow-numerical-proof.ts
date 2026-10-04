import { DocumentError, type PreparedFont, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import {
  Block,
  Document,
  type DocumentContentData,
  document,
  flow,
  flowFooter,
  flowHeader,
  type LineHeight,
  layout,
  paragraph,
  pt,
} from "@updf/layout";
import { inlineBackgroundProofDefinition } from "./inline-background-proof.js";

function definition(
  text: string,
  fontSize: number,
  font = "Helvetica",
  keepTogether = false,
  width = 760.03,
  height = 730.9,
  reserved = false,
): DocumentContentData {
  return document({
    children: flow({
      pageSize: { width, height },
      margins: reserved
        ? { top: 600.125, right: 40.25, bottom: 40.25, left: 700 }
        : { top: 700, right: 0, bottom: 0, left: 700 },
      children: [
        ...(reserved
          ? [flowHeader({ height: 99.875, children: [] }), flowFooter({ height: 29.75, children: [] })]
          : []),
        paragraph({
          children: text,
          style: { font, fontSize, color: [0, 0, 0], lineHeight: pt(10.3), textAlign: "left" },
          whiteSpace: "preserve",
          breakLongWords: "error",
          keepTogether,
        }),
      ],
    }),
  });
}
function success(input: DocumentContentData, font: PreparedFont) {
  const options = { resources: { Demo: font } };
  const result = layout(input, options);
  const bytes = render(result.document, options);
  const component = render(lower(h(Document, input.props), options), options);
  if (bytes.length !== component.length || bytes.some((byte, i) => byte !== component[i]))
    throw new Error("Fractional flow bytes");
  return { result, bytes: Array.from(bytes) };
}
function failure(input: DocumentContentData) {
  return [() => layout(input), () => lower(h(Document, input.props))].map((run) => {
    try {
      run();
    } catch (error) {
      if (!(error instanceof DocumentError)) throw error;
      return error.diagnostics;
    }
    throw new Error("Expected numerical geometry rejection");
  });
}
function fractionalParagraph(lineHeight: LineHeight, height = 37.2): DocumentContentData {
  return document({
    children: flow({
      pageSize: { width: 37, height },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: h(Block, {
        style: { padding: 6, paddingBottom: height === 31.2 ? 0 : 6 },
        children: paragraph({ style: { font: "Helvetica", fontSize: 9, lineHeight }, children: "hello hello" }),
      }),
    }),
  });
}
export function numericalFlowProof(font: PreparedFont) {
  const successes = [
    definition("A\nB\nC", 10.3),
    definition("A\nB\nC", 10.3, "Helvetica", true),
    definition("AAAAAAAAA", 10),
    definition("A\nB\nC", 10.3, "Helvetica", false, 800.28, 800.9, true),
    definition("А\nБ\nВ", 10.3, "Demo"),
    inlineBackgroundProofDefinition(),
    fractionalParagraph(pt(12.6)),
    fractionalParagraph(1.4),
  ].map((input) => success(input, font));
  const invalidAxis = (axis: "width" | "height") =>
    document({
      children: flow({
        pageSize: { width: axis === "width" ? 1e16 : 760.03, height: axis === "height" ? 1e16 : 730.9 },
        margins: {
          top: axis === "height" ? 1e16 - 2 : 700,
          right: 0,
          bottom: 0,
          left: axis === "width" ? 1e16 - 2 : 700,
        },
        children: [],
      }),
    });
  const failures = [
    definition("AAAAAAAAA", 10, "Helvetica", false, 760.03 - 1e-10),
    definition("A\nB\nC", 10.3, "Helvetica", true, 760.03, 730.9 - 1e-10),
    invalidAxis("width"),
    invalidAxis("height"),
    fractionalParagraph(1.4, 31.2),
  ].map(failure);
  return { successes, failures };
}
