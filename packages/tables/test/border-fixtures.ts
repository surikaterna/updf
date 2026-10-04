import type { NodeDefinition, RGB } from "@updf/core";
import { type TableInput, table, tableExtension } from "@updf/tables";
import { createExtensions, layoutFlow } from "../../../tests/fixtures/transitional-layout.js";

export const red = { width: 4, color: [1, 0, 0] as RGB };
export const blue = { width: 4, color: [0, 0, 1] as RGB };
export const row = { minHeight: 20, cells: [{}, {}] } as const;
export const base: TableInput = {
  columns: [{ width: 40 }, { width: 40 }],
  style: { padding: 0 },
  grid: { width: 2, color: [0, 0, 0] },
  body: [row],
};
export function run(input: TableInput, height = 100, options = {}) {
  return layoutFlow(
    {
      pageTemplate: { width: 100, height, margins: { top: 10, right: 10, bottom: 10, left: 10 } },
      body: [table(input)],
    },
    options,
    createExtensions([tableExtension]),
  );
}
export interface Band {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: RGB;
}
export function bands(nodes: readonly NodeDefinition[], x = 0, y = 0): Band[] {
  return nodes.flatMap((node): Band[] => {
    if (node.type === "paintGroup")
      return bands(node.children, x + (node.transform?.[4] ?? 0), y + (node.transform?.[5] ?? 0));
    return node.type === "rect" && node.paint?.fill
      ? [{ x: x + node.x, y: y + node.y, width: node.width, height: node.height, color: node.paint.fill }]
      : [];
  });
}
export const geometry = (band: Band) => [band.x, band.y, band.width, band.height, band.color];
