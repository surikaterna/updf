import { render } from "@updf/core";
import { layoutTableFlow } from "../../packages/layout/dist/cjs/tables/index.js";

/** Historical C table fixture remains a migration control until G removes the old API. */
export function legacyInventory(title: string) {
  const defaults = {
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const },
    lineHeight: 14,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "codePoint" as const,
  };
  const cell = (text: string) => ({ paragraph: { runs: [{ text }] } });
  const result = layoutTableFlow({
    pageTemplate: { width: 240, height: 240, margins: { top: 16, right: 16, bottom: 16, left: 16 } },
    body: [
      { type: "paragraph", paragraph: { ...defaults, runs: [{ text: title }] } },
      {
        type: "table",
        columns: [{ width: 140 }, { width: 68, defaults: { align: "right" } }],
        defaults: { ...defaults, padding: 4 },
        align: "left",
        repeatHeader: true,
        grid: { width: 1, color: [0.2, 0.3, 0.4] },
        header: {
          cells: [
            { ...cell("Inventory item"), background: [0.85, 0.92, 1] },
            { ...cell("Count"), background: [0.85, 0.92, 1] },
          ],
        },
        rows: Array.from({ length: 12 }, (_, i) => ({
          cells: [cell(`Item ${i + 1}\nWrapped description`), cell(String((i + 1) * 3))],
        })),
      },
      { type: "paragraph", paragraph: { ...defaults, runs: [{ text: "End of inventory" }] } },
    ],
  });
  return { bytes: render(result.document), result };
}
