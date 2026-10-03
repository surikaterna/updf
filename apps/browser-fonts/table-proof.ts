import { type PreparedFont, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { createExtensions, Document, document, flow, layout, paragraph, span } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";

export function tableProofDefinition() {
  const defaults = {
    defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 1] as const },
    lineHeight: 16,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "codePoint" as const,
  };
  return document({
    children: flow({
      pageSize: { width: 180, height: 100 },
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      extensions: createExtensions([tableExtension]),
      children: [
        paragraph({ ...defaults, children: "Привет" }),
        table({
          columns: [{ width: 100 }, { width: 60, style: { align: "right" } }],
          style: { ...defaults, padding: 2 },
          grid: { width: 1, color: [0, 0, 0] },
          head: {
            repeat: true,
            rows: [
              {
                cells: [
                  {
                    children: span({ children: "Header", style: { font: "Helvetica", color: [1, 0, 0] } }),
                    style: { background: [0.8, 1, 0.8] },
                  },
                  { children: "" },
                ],
              },
            ],
          },
          body: Array.from({ length: 7 }, (_, i) => ({
            cells: [
              { children: span({ children: `АБ ${i}`, style: { fontSize: 12 } }) },
              { children: span({ children: `Row${i}`, style: { font: "Helvetica" } }) },
            ],
          })),
        }),
        paragraph({ ...defaults, children: "End" }),
      ],
    }),
  });
}
export function tableProof(font: PreparedFont) {
  const options = { resources: { Demo: font } };
  const input = tableProofDefinition();
  const result = layout(input, options);
  const bytes = render(result.document, options);
  const tsx = render(lower(h(Document, input.props), options), options);
  if (bytes.length !== tsx.length || bytes.some((byte, i) => byte !== tsx[i]))
    throw new Error("Table adapter mismatch");
  const repeatedHeaderCount = result.placements.filter((placement) => placement.sourceIndex === 1).length - 1;
  return { bytes, result: { ...result, repeatedHeaderCount } };
}
