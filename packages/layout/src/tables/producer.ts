import { exceeds, fail, sum } from "@updf/core/internal";
import type { Paginator } from "../paginator.js";
import { rowInk } from "./ink.js";
import type { MeasuredRow, MeasuredTable } from "./measure.js";
import { paintRow, rowOutput } from "./paint.js";
import type { TablePlacement } from "./types.js";

function preflightRows(table: MeasuredTable, capacity: number): void {
  const freshHeaderHeight = table.definition.repeatHeader ? (table.header?.height ?? 0) : 0;
  for (const row of table.rows) {
    if (exceeds(sum([row.height, freshHeaderHeight]), capacity))
      fail("LAYOUT_OVERSIZED", row.path, "Row cannot fit a fresh body after repeated header");
  }
  if (!table.header) return;
  const first = table.rows[0];
  if (exceeds(sum([table.header.height, first?.height ?? 0]), capacity))
    fail("LAYOUT_OVERSIZED", first?.path ?? table.header.path, "Header and first row cannot fit a fresh body");
}

export function consumeTable(
  paginator: Paginator,
  table: MeasuredTable,
  index: number,
  tableIndex: number,
  capacity: number,
): readonly TablePlacement[] {
  const placements: TablePlacement[] = [];
  const { header, rows, definition } = table;
  let headerCopies = 0;
  let previousPage = -1;
  preflightRows(table, capacity);
  const place = (row: MeasuredRow, rowIndex: number, bottom: boolean): void => {
    const top = previousPage !== paginator.pageIndex;
    const placement = paginator.atomic(
      index,
      row.path,
      table.x,
      table.width,
      row.height,
      rowOutput(table, row, bottom),
      (y) => {
        rowInk(table, row, y, top, bottom);
        return paintRow(table, row, top, bottom);
      },
    );
    previousPage = paginator.pageIndex;
    placements.push({ ...placement, tableIndex, rowIndex, repeatedHeader: rowIndex === -1 && headerCopies > 0 });
    if (rowIndex === -1) headerCopies++;
  };
  const first = rows[0];
  if (header) {
    const pair = sum([header.height, first?.height ?? 0]);
    paginator.fit(pair, first?.path ?? header.path);
    place(header, -1, !first);
  }
  rows.forEach((row, i) => {
    if (!paginator.fits(row.height)) {
      paginator.advance(row.path);
      if (header && definition.repeatHeader) place(header, -1, false);
    }
    const next = rows[i + 1];
    const bottom = !next || !paginator.fits(row.height, next.height);
    place(row, i, bottom);
  });
  return placements;
}
