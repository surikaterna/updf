import type { NodeDefinition } from "@updf/core";
import type { MeasureContext, ParagraphProps } from "@updf/layout";
import { error, number } from "./checks.js";
import { cellSourcePath } from "./parts.js";
import type { CellProps, CellStyle, TableInput, TableRow } from "./types.js";

export interface MeasuredRow {
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
}
function inherit(...styles: readonly (CellStyle | undefined)[]): CellStyle {
  let result: CellStyle = {};
  for (const style of styles)
    if (style) result = { ...result, ...style, defaultStyle: { ...result.defaultStyle, ...style.defaultStyle } };
  return result;
}
function paragraphDefaults(style: CellStyle): ParagraphProps {
  const props = { ...style };
  delete props.padding;
  delete props.background;
  delete props.height;
  delete props.overflow;
  delete props.gap;
  return props;
}
function measuredCell(
  cell: CellProps,
  style: CellStyle,
  width: number,
  grid: number,
  context: MeasureContext,
  sourcePath: string,
) {
  const padding = style.padding ?? 4;
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
      padding: { top: padding, right: padding, bottom: padding, left: padding },
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
    const style = inherit(table.style, column.style, cell.style);
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
    if (cell.style.background)
      nodes.push({
        type: "rect",
        x,
        y: 0,
        width: cell.width,
        height,
        paint: { fill: cell.style.background, stroke: null },
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
export function paintRows(rows: readonly MeasuredRow[], table: TableInput, top = true, bottom = true): MeasuredRow {
  const nodes: NodeDefinition[] = [];
  const boundaries: number[] = [];
  let height = 0;
  for (const row of rows) {
    if (row.nodes.length) nodes.push({ type: "paintGroup", transform: [1, 0, 0, 1, 0, height], children: row.nodes });
    height += row.height;
    boundaries.push(height);
  }
  number(height, "/table/rows/height");
  if (height && table.grid?.width)
    edges(
      nodes,
      table.columns.map((column) => column.width),
      height,
      table,
      boundaries.slice(0, -1),
      top,
      bottom,
    );
  return { height, nodes };
}
function edges(
  nodes: NodeDefinition[],
  widths: readonly number[],
  height: number,
  table: TableInput,
  boundaries: readonly number[],
  top: boolean,
  bottom: boolean,
): void {
  const grid = table.grid;
  if (!grid) return;
  const width = widths.reduce((sum, value) => sum + value, 0);
  const paint = {
    stroke: grid.color,
    fill: null,
    width: grid.width,
    lineCap: "butt" as const,
    lineJoin: "bevel" as const,
  };
  const inset = grid.width;
  const topY = top ? inset : 0,
    bottomY = bottom ? height - inset : height;
  const lines: NodeDefinition[] = [];
  let x = 0;
  for (let i = 0; i <= widths.length; i++) {
    const edge = i === 0 ? inset : i === widths.length ? width - inset : x;
    lines.push({ type: "line", x: edge, y: topY, x2: edge, y2: bottomY, paint });
    x += widths[i] ?? 0;
  }
  for (const y of [topY, ...boundaries, bottomY])
    lines.push({ type: "line", x: inset, y, x2: width - inset, y2: y, paint });
  // Adjacent reserved regions paint complementary half-strokes at their shared edge.
  nodes.push({ type: "paintGroup", clip: { x: 0, y: 0, width, height }, children: lines });
}
