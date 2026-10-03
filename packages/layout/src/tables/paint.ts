import type { NodeDefinition } from "@updf/core";
import { codePoints, fail, sum } from "@updf/core/internal";
import { paragraphLine } from "../fragments.js";
import type { MeasuredRow, MeasuredTable } from "./measure.js";

export function rowOutput(
  table: MeasuredTable,
  row: MeasuredRow,
  bottom: boolean,
): {
  nodes: number;
  text: number;
  commands: number;
  work: number;
} {
  const backgrounds = row.cells.filter((cell) => cell.background).length;
  const lines = row.cells.reduce((n, cell) => n + cell.measurement.lines.length, 0);
  const text = row.cells.reduce(
    (n, cell) =>
      n +
      cell.measurement.lines.reduce(
        (m, line) => m + line.fragments.reduce((s, fragment) => s + codePoints(fragment.text), 0),
        0,
      ),
    0,
  );
  const edges = table.definition.grid ? row.cells.length + 2 + (bottom ? 1 : 0) : 0;
  return { nodes: backgrounds + lines + edges, text, commands: backgrounds * 5 + edges * 2, work: row.work };
}
export function paintRow(
  table: MeasuredTable,
  row: MeasuredRow,
  top: boolean,
  bottom: boolean,
): readonly NodeDefinition[] {
  const nodes: NodeDefinition[] = [];
  for (const cell of row.cells) {
    if (cell.background)
      nodes.push({
        type: "rect",
        x: cell.x,
        y: 0,
        width: cell.width,
        height: row.height,
        paint: { fill: cell.background, stroke: null },
      });
    for (const line of cell.measurement.lines) {
      const y = sum([cell.inset, line.top]);
      if (y + line.height > row.height - cell.inset)
        fail("GEOMETRY", row.path, "Materialized cell line exceeds reserved content area");
      nodes.push(paragraphLine(cell.paragraph, line, cell.x + cell.inset, y, cell.contentWidth));
    }
  }
  const grid = table.definition.grid;
  if (!grid) return nodes;
  // A full-width inset contains true half-stroke ink and core's conservative envelope.
  const inset = grid.width;
  const paint = {
    stroke: grid.color,
    width: grid.width,
    fill: null,
    lineCap: "butt" as const,
    lineJoin: "bevel" as const,
  };
  const topY = top ? inset : 0;
  const bottomY = bottom ? row.height - inset : row.height;
  nodes.push({ type: "line", x: inset, y: topY, x2: table.width - inset, y2: topY, paint });
  if (bottom) nodes.push({ type: "line", x: inset, y: bottomY, x2: table.width - inset, y2: bottomY, paint });
  const boundaries = [inset, ...row.cells.slice(1).map((cell) => cell.x), table.width - inset];
  for (const x of boundaries) nodes.push({ type: "line", x, y: topY, x2: x, y2: bottomY, paint });
  return nodes;
}
