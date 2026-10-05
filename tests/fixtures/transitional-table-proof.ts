import type { TableFlowDefinition } from "../../packages/layout/dist/tables/index.js";

export function tableProofDefinition(): TableFlowDefinition {
  const defaults = {
    defaultStyle: { font: "Demo", fontSize: 10, color: [0, 0, 1] as const },
    lineHeight: 16,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "codePoint" as const,
  };
  return {
    pageTemplate: { width: 180, height: 100, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
    body: [
      { type: "paragraph", paragraph: { ...defaults, runs: [{ text: "Привет" }] } },
      {
        type: "table",
        columns: [{ width: 100 }, { width: 60, defaults: { align: "right" } }],
        defaults: { ...defaults, padding: 2 },
        align: "center",
        repeatHeader: true,
        grid: { width: 1, color: [0, 0, 0] },
        header: {
          cells: [
            {
              paragraph: { runs: [{ text: "Header", style: { font: "Helvetica", color: [1, 0, 0] } }] },
              background: [0.8, 1, 0.8],
            },
            { paragraph: { runs: [] } },
          ],
        },
        rows: Array.from({ length: 7 }, (_, i) => ({
          cells: [
            { paragraph: { runs: [{ text: `АБ ${i}`, style: { fontSize: 12 } }] } },
            { paragraph: { runs: [{ text: `Row${i}`, style: { font: "Helvetica" } }] } },
          ],
        })),
      },
      { type: "paragraph", paragraph: { ...defaults, runs: [{ text: "End" }] } },
    ],
  };
}
