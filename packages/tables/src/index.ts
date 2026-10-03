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
  SectionProps,
  TableColumn,
  TableDefinition,
  TableInput,
  TableProps,
  TableRow,
  TableSection,
} from "./types.js";
export const Table = Object.freeze(
  Object.assign(blockComponent<TableProps>(tableExtension), { Head, Body, Foot, Row, Cell, HeaderCell }),
);
export function table(input: TableInput) {
  if (!data(validate(input))) error("/table/body", "Data tables require a body row array");
  return extension(tableExtension, input);
}
