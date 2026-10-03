import { fail, sum } from "@updf/core/internal";
import type { MeasuredRow, MeasuredTable } from "./measure.js";

function contained(start: number, end: number, low: number, high: number, path: string): void {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < low || end > high || end < start)
    fail("GEOMETRY", path, "Materialized table ink exceeds its reserved geometry");
}
export function rowInk(table: MeasuredTable, row: MeasuredRow, y: number, top: boolean, bottom: boolean): void {
  for (const [index, cell] of row.cells.entries()) {
    const path = `${row.path}/cells/${index}`;
    const left = table.x + (cell.x + cell.inset);
    const right = table.x + (cell.x + cell.inset + cell.contentWidth);
    contained(left, right, table.x + cell.x, table.x + (cell.x + cell.width), path);
    for (const line of cell.measurement.lines) {
      const local = sum([cell.inset, line.top]);
      const start = y + local;
      const end = y + (local + line.height);
      contained(start, end, y, y + row.height, path);
    }
  }
  const grid = table.definition.grid;
  if (!grid) return;
  const envelope = (grid.width / 2) * Math.SQRT2;
  const inset = grid.width;
  contained(
    table.x + inset - envelope,
    table.x + (table.width - inset) + envelope,
    table.x,
    table.x + table.width,
    row.path,
  );
  const start = top ? inset : 0;
  const end = bottom ? row.height - inset : row.height;
  contained(
    y + start - envelope,
    y + end + envelope,
    top ? y : y - envelope,
    bottom ? y + row.height : y + row.height + envelope,
    row.path,
  );
}
