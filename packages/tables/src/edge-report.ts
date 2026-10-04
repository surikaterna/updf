import type { LocalEdgeClaim, MeasureContext } from "@updf/layout";
import type { MeasuredRow } from "./measure.js";
import type { TableInput } from "./types.js";

export function reportGrid(
  output: MeasuredRow,
  table: TableInput,
  boundaries: readonly number[],
  context: MeasureContext,
): MeasuredRow {
  const grid = table.grid;
  if (!output.height || !grid?.width) return output;
  const width = table.columns.reduce((sum, column) => sum + column.width, 0);
  const claims: LocalEdgeClaim[] = [];
  const add = (
    axis: LocalEdgeClaim["axis"],
    coordinate: number,
    ownerSide: LocalEdgeClaim["ownerSide"],
    perimeter: boolean,
  ): void => {
    claims.push({
      axis,
      coordinate,
      ownerSide,
      interval: [0, axis === "horizontal" ? width : output.height],
      provenance: "grid",
      width: grid.width,
      color: grid.color,
      sourcePath: context.sourcePath,
      ...(perimeter ? { unsharedInset: grid.width } : {}),
      startInset: grid.width,
      endInset: grid.width,
    });
  };
  add("horizontal", 0, "top", true);
  for (const boundary of boundaries) add("horizontal", boundary, "bottom", false);
  add("horizontal", output.height, "bottom", true);
  let x = 0;
  add("vertical", 0, "left", true);
  for (const [index, column] of table.columns.entries()) {
    x += column.width;
    add("vertical", x, "right", index === table.columns.length - 1);
  }
  return { ...output, nodes: [context.edgeRegion({ width, height: output.height, nodes: output.nodes, claims })] };
}
