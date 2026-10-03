import { DocumentError, type PreparedFont, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { type FlowDocumentDefinition, layoutFlow, layoutFlowUnknown } from "@updf/layout";
import { Flow } from "@updf/layout/vdom";

function definition(text: string, fontSize: number, font = "Helvetica"): FlowDocumentDefinition {
  return {
    pageTemplate: { width: 760.03, height: 730.9, margins: { top: 700, right: 0, bottom: 0, left: 700 } },
    body: [
      {
        type: "paragraph",
        paragraph: {
          runs: [{ text }],
          defaultStyle: { font, fontSize, color: [0, 0, 0] },
          lineHeight: 10.3,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      },
    ],
  };
}
function success(input: FlowDocumentDefinition, font: PreparedFont) {
  const options = { resources: { Demo: font } };
  const result = layoutFlowUnknown(input, options);
  const bytes = render(result.document, options);
  const component = render(lower(h(Flow.Document, input), options), options);
  if (bytes.length !== component.length || bytes.some((byte, i) => byte !== component[i]))
    throw new Error("Fractional flow bytes");
  return { result, bytes: Array.from(bytes) };
}
function failure(input: FlowDocumentDefinition) {
  return [() => layoutFlow(input), () => lower(h(Flow.Document, input))].map((run) => {
    try {
      run();
    } catch (error) {
      if (!(error instanceof DocumentError)) throw error;
      return error.diagnostics;
    }
    throw new Error("Expected numerical geometry rejection");
  });
}
export function numericalFlowProof(font: PreparedFont) {
  const height = definition("A\nB\nC", 10.3);
  const width = definition("AAAAAAAAA", 10);
  const kept = { ...height, body: height.body.map((block) => ({ ...block, keepTogether: true })) };
  const reserved = {
    ...height,
    pageTemplate: {
      ...height.pageTemplate,
      width: 800.28,
      height: 800.9,
      margins: { top: 600.125, right: 40.25, bottom: 40.25, left: 700 },
      header: { height: 99.625, children: [] },
      headerBodyGap: 0.25,
      footer: { height: 29.5, children: [] },
      bodyFooterGap: 0.25,
    },
  };
  const successes = [height, kept, width, reserved, definition("А\nБ\nВ", 10.3, "Demo")].map((input) =>
    success(input, font),
  );
  const failures = [
    { ...width, pageTemplate: { ...width.pageTemplate, width: 760.03 - 1e-10 } },
    { ...kept, pageTemplate: { ...kept.pageTemplate, height: 730.9 - 1e-10 } },
    {
      ...height,
      body: [],
      pageTemplate: {
        ...height.pageTemplate,
        width: 1e16,
        margins: { ...height.pageTemplate.margins, left: 1e16 - 2 },
      },
    },
    {
      ...height,
      body: [],
      pageTemplate: {
        ...height.pageTemplate,
        height: 1e16,
        margins: { ...height.pageTemplate.margins, top: 1e16 - 2 },
      },
    },
  ].map(failure);
  return { successes, failures };
}
