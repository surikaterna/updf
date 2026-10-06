import { render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import type { PreparedFont } from "@updf/fonts";
import { Document, document, flow, flowHeader, layout, paragraph, pt, span } from "@updf/layout";
import { textOptions } from "./text-options.js";

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
              type: "richText",
              x: 0,
              y: 0,
              width: 150,
              height: 16,
              paragraphs: [
                {
                  runs: [{ text: "Flow header" }],
                  defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
                  lineHeight: 16,
                  align: "left",
                  whiteSpace: "preserve",
                  breakLongWords: "error",
                },
              ],
            },
          ],
        }),
        paragraph({
          style: { font: "Demo", fontSize: 16, color: [0, 0, 0], lineHeight: pt(26), textAlign: "center" },
          children: [
            span({ children: "Привет  ", style: { color: [0, 0, 1] } }),
            span({ children: " portable\n", style: { font: "Helvetica", fontSize: 20, color: [1, 0, 0] } }),
            "А\u00a0Б\nMeasured flow\nComplete lines\nRepeated regions",
          ],
          whiteSpace: "collapse",
          breakLongWords: "codePoint",
        }),
      ],
    }),
  });
}
export function flowProof(font: PreparedFont) {
  const options = textOptions({ resources: { Demo: font } });
  const definition = flowProofDefinition();
  const result = layout(definition, options);
  const bytes = render(result.document, options);
  const vdomBytes = render(lower(h(Document, definition.props), options), options);
  if (bytes.length !== vdomBytes.length || bytes.some((byte, i) => byte !== vdomBytes[i]))
    throw new Error("Flow adapter mismatch");
  return { bytes, result };
}
