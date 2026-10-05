/** Optional atomic-row tables from `@updf/tables`; install tableExtension in a local `@updf/layout` Flow. */
import { blockComponent, extension } from "@updf/layout";
import { tableExtension } from "./adapter.js";
import { error } from "./checks.js";
import { Body, Cell, Foot, Head, HeaderCell, Row } from "./parts.js";
import type { TableInput, TableProps } from "./types.js";
import { data, validate } from "./validate.js";

export { tableExtension } from "./adapter.js";
export type {
  CellProps,
  CellStyle,
  RowProps,
  RowStyle,
  SectionProps,
  TableColumn,
  TableDefinition,
  TableInput,
  TableProps,
  TableRow,
  TableSection,
  TableStyle,
} from "./types.js";
/** JSX table with Head/Body/Foot/Row/Cell/HeaderCell author slots; HeaderCell is accepted only in Head. */
export const Table = Object.freeze(
  Object.assign(blockComponent<TableProps>(tableExtension), { Head, Body, Foot, Row, Cell, HeaderCell }),
);
/**
 * Validate data table grammar and snapshot props without freezing caller data.
 * Requires a body array; each row has exactly one cell per column. Columns resolve
 * before measurement. Unknown fields, getters, holes, present undefined and class
 * records reject. Install tableExtension by identity for layout/measure; rows stay
 * atomic and an unfit fresh-page row fails LAYOUT_OVERSIZED, even with hidden cell overflow.
 */
export function table(input: TableInput) {
  if (!data(validate(input))) error("/table/body", "Data tables require a body row array");
  return extension(tableExtension, input);
}
