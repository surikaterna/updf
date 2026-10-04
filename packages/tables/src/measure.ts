import type { NodeDefinition } from "@updf/core";
import type { MeasureContext, ParagraphProps } from "@updf/layout";
import { error, number } from "./checks.js";
import { reportGrid } from "./edge-report.js";
import { cellSourcePath } from "./parts.js";
import type { CellProps, CellStyle, TableInput, TableRow } from "./types.js";

export interface MeasuredRow {
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
}
function inherit(...styles: readonly (CellStyle | undefined)[]): CellStyle {
  let result: CellStyle = {};
  for (const style of styles) {
    if (!style) continue;
    const padding = style.padding;
    const expanded =
      padding === undefined
        ? {}
        : {
            paddingTop: padding,
            paddingRight: padding,
            paddingBottom: padding,
            paddingLeft: padding,
          };
    result = { ...result, ...expanded, ...style };
  }
  return result;
}
export function paragraphDefaults(style: CellStyle): ParagraphProps {
  const { whiteSpace, breakLongWords, ...text } = style;
  delete text.padding;
  delete text.paddingTop;
  delete text.paddingRight;
  delete text.paddingBottom;
  delete text.paddingLeft;
  delete text.backgroundColor;
  delete text.height;
  delete text.overflow;
  delete text.gap;
  return {
    style: text,
    ...(whiteSpace === undefined ? {} : { whiteSpace }),
    ...(breakLongWords === undefined ? {} : { breakLongWords }),
  };
}
function measuredCell(
  cell: CellProps,
  style: CellStyle,
  width: number,
  grid: number,
  context: MeasureContext,
  sourcePath: string,
) {
  const inset = grid;
  const innerWidth = width - 2 * grid;
  number(innerWidth, `${context.sourcePath}${sourcePath}/width`, true);
  const children = typeof cell.children === "number" ? String(cell.children) : (cell.children ?? "");
  const constraints = {
    width: innerWidth,
    defaults: paragraphDefaults(style),
    implicitParagraph: true as const,
    sourcePath,
    style: {
      padding: 4,
      ...(style.paddingTop === undefined ? {} : { paddingTop: style.paddingTop }),
      ...(style.paddingRight === undefined ? {} : { paddingRight: style.paddingRight }),
      ...(style.paddingBottom === undefined ? {} : { paddingBottom: style.paddingBottom }),
      ...(style.paddingLeft === undefined ? {} : { paddingLeft: style.paddingLeft }),
      ...(style.gap === undefined ? {} : { gap: style.gap }),
      ...(style.height === undefined ? {} : { height: style.height }),
      ...(style.overflow === undefined ? {} : { overflow: style.overflow }),
    },
  };
  return { measured: context.measureContent(children, constraints), inset };
}
export function measureRow(row: TableRow, table: TableInput, context: MeasureContext, sourcePath: string): MeasuredRow {
  const grid = table.grid?.width ?? 0;
  const cells = row.cells.map((cell, index) => {
    const column = table.columns[index];
    if (!column) error("/table/columns", "Missing column");
    const style = inherit(table.style, column.style, row.style, cell.style);
    return {
      ...measuredCell(
        cell,
        style,
        column.width,
        grid,
        context,
        cellSourcePath(cell, context.sourcePath, `${sourcePath}/cells/${index}`),
      ),
      width: column.width,
      style,
    };
  });
  const height = cells.reduce(
    (max, cell) => Math.max(max, cell.measured.size.height + 2 * cell.inset),
    row.minHeight ?? 0,
  );
  number(height, "/table/row/height");
  const nodes: NodeDefinition[] = [];
  let x = 0;
  for (const cell of cells) {
    if (cell.style.backgroundColor)
      nodes.push({
        type: "rect",
        x,
        y: 0,
        width: cell.width,
        height,
        paint: { fill: cell.style.backgroundColor, stroke: null },
      });
    nodes.push({
      type: "paintGroup",
      transform: [1, 0, 0, 1, x + cell.inset, cell.inset],
      children: cell.measured.nodes,
    });
    x += cell.width;
  }
  return { height, nodes };
}
export function paintRows(rows: readonly MeasuredRow[], table: TableInput, context: MeasureContext): MeasuredRow {
  const nodes: NodeDefinition[] = [];
  const boundaries: number[] = [];
  let height = 0;
  for (const row of rows) {
    if (row.nodes.length) nodes.push({ type: "paintGroup", transform: [1, 0, 0, 1, 0, height], children: row.nodes });
    height += row.height;
    boundaries.push(height);
  }
  number(height, "/table/rows/height");
  return reportGrid({ height, nodes }, table, boundaries.slice(0, -1), context);
}
