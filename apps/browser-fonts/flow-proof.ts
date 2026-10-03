import { type PreparedFont, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { Document, document, flow, flowHeader, layout, paragraph, span } from "@updf/layout";

export function flowProofDefinition() {
  return document({
    children: flow({
      pageSize: { width: 180, height: 140 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      children: [
        flowHeader({
          height: 20,
          children: [
            {
              type: "text",
              x: 0,
              y: 0,
              width: 150,
              height: 16,
              text: "Flow header",
              fontSize: 10,
              lineHeight: 16,
              align: "left",
            },
          ],
        }),
        paragraph({
          defaultStyle: { font: "Demo", fontSize: 16, color: [0, 0, 0] },
          children: [
            span({ children: "Привет  ", style: { color: [0, 0, 1] } }),
            span({ children: " portable\n", style: { font: "Helvetica", fontSize: 20, color: [1, 0, 0] } }),
            "А\u00a0Б\nMeasured flow\nComplete lines\nRepeated regions",
          ],
          lineHeight: 26,
          align: "center",
          whiteSpace: "collapse",
          breakLongWords: "codePoint",
        }),
      ],
    }),
  });
}
export function flowProof(font: PreparedFont) {
  const options = { resources: { Demo: font } };
  const definition = flowProofDefinition();
  const result = layout(definition, options);
  const bytes = render(result.document, options);
  const vdomBytes = render(lower(h(Document, definition.props), options), options);
  if (bytes.length !== vdomBytes.length || bytes.some((byte, i) => byte !== vdomBytes[i]))
    throw new Error("Flow adapter mismatch");
  return { bytes, result };
}
