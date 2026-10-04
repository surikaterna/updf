import type { ExpandedBorders, Insets, LocalEdgeClaim, MeasureContext } from "@updf/layout";
import type { MeasuredRow } from "./measure.js";
import type { TableInput } from "./types.js";

export function edgeInsets(borders: ExpandedBorders, grid: number): Insets {
  const width = (key: keyof ExpandedBorders): number => (key in borders ? (borders[key]?.width ?? 0) : grid);
  return {
    top: width("borderTop"),
    right: width("borderRight"),
    bottom: width("borderBottom"),
    left: width("borderLeft"),
  };
}

function endpointInsets(horizontal: boolean, explicit: boolean, insets: Insets): readonly [number, number] {
  if (!horizontal) return [insets.top, insets.bottom];
  return explicit ? [0, 0] : [insets.left, insets.right];
}

export function cellClaims(
  borders: ExpandedBorders,
  insets: Insets,
  x: number,
  width: number,
  height: number,
  table: TableInput,
  sourcePath: string,
): LocalEdgeClaim[] {
  if (!height) return [];
  return (["top", "bottom", "left", "right"] as const).map((side) => {
    const key = `border${side[0]?.toUpperCase()}${side.slice(1)}` as keyof ExpandedBorders;
    const explicit = key in borders;
    const edge = explicit ? borders[key] : table.grid;
    const horizontal = side === "top" || side === "bottom";
    const thickness = edge?.width ?? 0;
    const [startInset, endInset] = thickness ? endpointInsets(horizontal, explicit, insets) : ([0, 0] as const);
    return {
      axis: horizontal ? "horizontal" : "vertical",
      coordinate: horizontal ? (side === "top" ? 0 : height) : x + (side === "left" ? 0 : width),
      interval: horizontal ? [x, x + width] : [0, height],
      ownerSide: side,
      provenance: explicit ? "explicit" : "grid",
      width: thickness,
      color: edge?.color ?? [0, 0, 0],
      sourcePath,
      unsharedInset: explicit ? thickness / 2 : thickness,
      startInset,
      endInset,
    };
  });
}

export function reportEdges(output: MeasuredRow, table: TableInput, context: MeasureContext): MeasuredRow {
  if (!output.height || !output.claims?.length) return { height: output.height, nodes: output.nodes };
  const width = table.columns.reduce((sum, column) => sum + column.width, 0);
  const claims = [...output.claims].sort((a, b) => a.axis.localeCompare(b.axis) || a.coordinate - b.coordinate);
  return {
    height: output.height,
    nodes: [context.edgeRegion({ width, height: output.height, nodes: output.nodes, claims })],
  };
}
