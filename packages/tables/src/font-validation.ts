import { type MeasureContext, paragraph } from "@updf/layout";
import { paragraphDefaults } from "./measure.js";
import { cellSourcePath } from "./parts.js";
import type { CellStyle, TableInput } from "./types.js";

export function validateFonts(table: TableInput, context: MeasureContext): void {
  const seen = new Set<CellStyle>();
  const check = (style: CellStyle | undefined, sourcePath: string): void => {
    if (!style || seen.has(style)) return;
    seen.add(style);
    context.measureContent(paragraph({ children: "", ...paragraphDefaults(style) }), {
      width: context.width,
      sourcePath,
    });
  };
  check(table.style, "/props/style");
  for (const [index, column] of table.columns.entries()) check(column.style, `/props/columns/${index}/style`);
  for (const [name, rows] of [
    ["head", table.head?.rows ?? []],
    ["body", table.body],
    ["foot", table.foot?.rows ?? []],
  ] as const)
    for (const [index, row] of rows.entries())
      for (const [column, cell] of row.cells.entries())
        check(
          cell.style,
          `${cellSourcePath(cell, context.sourcePath, `/props/${name}${name === "body" ? "" : "/rows"}/${index}/cells/${column}`)}/style`,
        );
}
