import { defineBlockAdapter, type MeasureContext, type MeasuredBlock } from "@updf/layout";
import { error, number } from "./checks.js";
import { decorations } from "./decorations.js";
import { validateFonts } from "./font-validation.js";
import { type MeasuredRow, measureRow, paintRows } from "./measure.js";
import { fromParts } from "./parts.js";
import type { TableDefinition } from "./types.js";
import { data, validate } from "./validate.js";

function measured(input: TableDefinition, context: MeasureContext): MeasuredBlock {
  if (context.ancestors.includes("updf.table"))
    error(context.sourcePath, "Nested tables are unsupported", "VDOM_HIERARCHY");
  const table = data(input) ? input : fromParts(input, context);
  const width = table.columns.reduce((sum, column) => sum + column.width, 0);
  number(width, "/table/columns", true);
  if (width > context.width) error("/table/columns", "Table width exceeds available width", "GEOMETRY");
  validateFonts(table, context);
  const plan = decorations(table, context);
  const rows = table.body.map((row, index) => measureRow(row, table, context, `/props/body/${index}`));
  return {
    ...(table.grid?.width ? { sharedEdges: true } : {}),
    fragmentation: rows.length ? "splittable" : "atomic",
    extent: Math.max(1, rows.length),
    ...(plan ? { decorations: plan } : {}),
    sourceExtent: rows.length,
    ...(rows.length ? { sourcePaths: rows.map((_row, index) => `/props/body/${index}`) } : {}),
    sourceKeys: table.body.map((row) => row.key ?? null),
    naturalSize: { width, height: rows.reduce((sum, row) => sum + row.height, 0) },
    fragment(request) {
      if (!rows.length) return { status: "placed", nextOffset: 1, height: 0, nodes: [] };
      const nextOffset = selectRows(rows, request.offset, request.availableHeight);
      if (nextOffset === request.offset) return { status: "defer" };
      const output = paintRows(rows.slice(request.offset, nextOffset), table, context);
      return { status: "placed", nextOffset, height: output.height, nodes: output.nodes };
    },
  };
}
function selectRows(rows: readonly MeasuredRow[], offset: number, availableHeight: number): number {
  let height = 0;
  while (offset < rows.length) {
    const row = rows[offset];
    if (!row || height + row.height > availableHeight) break;
    height += row.height;
    offset++;
  }
  return offset;
}
export const tableExtension = defineBlockAdapter<TableDefinition>({ name: "updf.table", validate, measure: measured });
