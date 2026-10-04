import type { NodeDefinition } from "@updf/core";
import type { Insets, LocalEdgeClaim, MeasureContext, ParagraphProps } from "@updf/layout";
import { cellBorders } from "./borders.js";
import { error, number } from "./checks.js";
import { cellClaims, edgeInsets, reportEdges } from "./edge-report.js";
import { cellSourcePath } from "./parts.js";
import type { CellProps, CellStyle, TableInput, TableRow } from "./types.js";

export interface MeasuredRow {
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
  readonly claims?: readonly LocalEdgeClaim[];
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
    result = { ...result, ...expanded, ...style, ...cellBorders(style, "/style") };
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
  delete text.border;
  delete text.borderTop;
  delete text.borderRight;
  delete text.borderBottom;
  delete text.borderLeft;
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
  inset: Insets,
  context: MeasureContext,
  sourcePath: string,
) {
  const innerWidth = width - inset.left - inset.right;
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
function measureCells(row: TableRow, table: TableInput, context: MeasureContext, sourcePath: string) {
  const grid = table.grid?.width ?? 0;
  return row.cells.map((cell, index) => {
    const column = table.columns[index];
    if (!column) error("/table/columns", "Missing column");
    const style = inherit(table.style, column.style, row.style, cell.style);
    const borders = cellBorders(style, `${context.sourcePath}${sourcePath}/cells/${index}/style`);
    const inset = edgeInsets(borders, grid);
    return {
      ...measuredCell(
        cell,
        style,
        column.width,
        inset,
        context,
        cellSourcePath(cell, context.sourcePath, `${sourcePath}/cells/${index}`),
      ),
      width: column.width,
      style,
      borders,
      sourcePath: cellSourcePath(cell, context.sourcePath, `${sourcePath}/cells/${index}`),
    };
  });
}
export function measureRow(row: TableRow, table: TableInput, context: MeasureContext, sourcePath: string): MeasuredRow {
  const cells = measureCells(row, table, context, sourcePath);
  const height = cells.reduce(
    (max, cell) => Math.max(max, cell.measured.size.height + cell.inset.top + cell.inset.bottom),
    row.minHeight ?? 0,
  );
  number(height, "/table/row/height");
  const nodes: NodeDefinition[] = [];
  const claims: LocalEdgeClaim[] = [];
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
      transform: [1, 0, 0, 1, x + cell.inset.left, cell.inset.top],
      children: cell.measured.nodes,
    });
    claims.push(
      ...cellClaims(cell.borders, cell.inset, x, cell.width, height, table, `${context.sourcePath}${cell.sourcePath}`),
    );
    x += cell.width;
  }
  return { height, nodes, claims };
}
export function paintRows(rows: readonly MeasuredRow[], table: TableInput, context: MeasureContext): MeasuredRow {
  const nodes: NodeDefinition[] = [];
  const claims: LocalEdgeClaim[] = [];
  let height = 0;
  for (const row of rows) {
    if (row.nodes.length) nodes.push({ type: "paintGroup", transform: [1, 0, 0, 1, 0, height], children: row.nodes });
    for (const claim of row.claims ?? [])
      claims.push({
        ...claim,
        coordinate: claim.coordinate + (claim.axis === "horizontal" ? height : 0),
        interval: claim.axis === "vertical" ? [claim.interval[0] + height, claim.interval[1] + height] : claim.interval,
      });
    height += row.height;
  }
  number(height, "/table/rows/height");
  return reportEdges({ height, nodes, claims }, table, context);
}
