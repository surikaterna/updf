import { render } from "@updf/core";
import { createExtensions, layoutFlow, paragraph } from "@updf/layout";
import { table, tableExtension } from "@updf/tables";

export function composableInventory(title: string) {
  const defaults = {
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] as const },
    lineHeight: 14,
    align: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "codePoint" as const,
  };
  const result = layoutFlow(
    {
      pageTemplate: { width: 240, height: 240, margins: { top: 16, right: 16, bottom: 16, left: 16 } },
      body: [
        paragraph({ ...defaults, children: title }),
        table({
          columns: [{ width: 140 }, { width: 68, style: { align: "right" } }],
          style: { ...defaults, padding: 4 },
          grid: { width: 1, color: [0.2, 0.3, 0.4] },
          head: {
            repeat: true,
            rows: [
              {
                cells: [
                  { children: "Inventory item", style: { background: [0.85, 0.92, 1] } },
                  { children: "Count", style: { background: [0.85, 0.92, 1] } },
                ],
              },
            ],
          },
          body: Array.from({ length: 12 }, (_, i) => ({
            key: `item-${i + 1}`,
            cells: [{ children: `Item ${i + 1}\nWrapped description` }, { children: String((i + 1) * 3) }],
          })),
        }),
        paragraph({ ...defaults, children: "End of inventory" }),
      ],
    },
    {},
    createExtensions([tableExtension]),
  );
  return { bytes: render(result.document), result };
}
