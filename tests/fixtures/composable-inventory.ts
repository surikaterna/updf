import { render } from "@updf/core";
import { table, tableExtension } from "@updf/tables";
import { createExtensions, layoutFlow, paragraph } from "./transitional-layout.js";

export function composableInventory(title: string) {
  const defaults = {
    font: "Helvetica",
    fontSize: 10,
    color: [0, 0, 0] as const,
    lineHeight: { unit: "pt" as const, value: 14 },
    textAlign: "left" as const,
    whiteSpace: "preserve" as const,
    breakLongWords: "codePoint" as const,
  };
  const { whiteSpace, breakLongWords, ...style } = defaults;
  const text = { style, whiteSpace, breakLongWords };
  const result = layoutFlow(
    {
      pageTemplate: { width: 240, height: 240, margins: { top: 16, right: 16, bottom: 16, left: 16 } },
      body: [
        paragraph({ ...text, children: title }),
        table({
          columns: [{ width: 140 }, { width: 68, style: { textAlign: "right" } }],
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
        paragraph({ ...text, children: "End of inventory" }),
      ],
    },
    {},
    createExtensions([tableExtension]),
  );
  return { bytes: render(result.document), result };
}
