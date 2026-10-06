import type { ParagraphDefinition, RGB } from "@updf/core";
import { DocumentError, fail, type LayoutOperation, MetricSum, sum } from "@updf/core/internal";
import type { TextMeasurement } from "@updf/text";
import { derivedAxis } from "../axis.js";
import type { TemplateGeometry } from "../template.js";
import type { TableDefinition, TableRow } from "./types.js";
import { effective } from "./validate.js";

export interface MeasuredCell {
  readonly x: number;
  readonly width: number;
  readonly inset: number;
  readonly contentWidth: number;
  readonly paragraph: ParagraphDefinition;
  readonly measurement: TextMeasurement;
  readonly background?: RGB;
}
export interface MeasuredRow {
  readonly cells: readonly MeasuredCell[];
  readonly height: number;
  readonly work: number;
  readonly path: string;
}
export interface MeasuredTable {
  readonly definition: TableDefinition;
  readonly width: number;
  readonly x: number;
  readonly rows: readonly MeasuredRow[];
  readonly header?: MeasuredRow;
}
function measureCell(
  paragraph: ParagraphDefinition,
  width: number,
  path: string,
  operation: LayoutOperation,
): TextMeasurement {
  try {
    return operation.measureText({ width, paragraphs: [paragraph] }, path);
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic) throw error;
    throw new DocumentError(
      diagnostic.code,
      diagnostic.path.replace(`${path}/paragraphs/0`, `${path}/paragraph`),
      diagnostic.message,
      diagnostic,
    );
  }
}
function measureRow(
  row: TableRow,
  table: TableDefinition,
  path: string,
  operation: LayoutOperation,
  origin: number,
): MeasuredRow {
  let height = row.minRowHeight ?? 0;
  let work = 0;
  const offsets = new MetricSum();
  const cells = row.cells.map((cell, index) => {
    const column = table.columns[index];
    if (!column) fail("TYPE", path, "Missing column");
    const style = effective(table.defaults, column.defaults, cell);
    const inset = sum([style.padding, table.grid?.width ?? 0]);
    const x = offsets.value;
    offsets.add(column.width);
    const at = `${path}/cells/${index}`;
    if (x + column.width > offsets.value) fail("GEOMETRY", at, "Materialized column exceeds its reservation");
    const axis = derivedAxis(x + inset, offsets.value - inset, at);
    derivedAxis(origin + axis.start, origin + axis.end, at);
    const measurement = measureCell(style.paragraph, axis.capacity, at, operation);
    height = Math.max(height, sum([measurement.consumedHeight, inset, inset]));
    work += measurement.lines.reduce((total, line) => total + 2 + 2 * line.fragments.length, 0);
    return {
      x,
      width: column.width,
      inset,
      contentWidth: axis.capacity,
      paragraph: style.paragraph,
      measurement,
      ...(style.background ? { background: style.background } : {}),
    };
  });
  if (!Number.isFinite(height) || height <= 0) fail("GEOMETRY", path, "Row height must be finite and positive");
  return { cells, height, work, path };
}
export function measureTable(
  table: TableDefinition,
  geometry: TemplateGeometry,
  path: string,
  operation: LayoutOperation,
): MeasuredTable {
  const width = sum(table.columns.map((column) => column.width));
  if (!Number.isFinite(width) || width > geometry.body.width)
    fail("GEOMETRY", `${path}/columns`, "Table width exceeds body");
  const offset = table.align === "left" ? 0 : (geometry.body.width - width) / (table.align === "center" ? 2 : 1);
  const x = geometry.body.x + offset;
  if (x + width > geometry.horizontal.end) fail("GEOMETRY", `${path}/columns`, "Materialized table exceeds body");
  return {
    definition: table,
    width,
    x,
    rows: table.rows.map((row, i) => measureRow(row, table, `${path}/rows/${i}`, operation, x)),
    ...(table.header ? { header: measureRow(table.header, table, `${path}/header`, operation, x) } : {}),
  };
}
