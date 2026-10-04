import type { NodeDefinition } from "@updf/core";
import type { ExpandedBorders } from "./borders.js";

/** Top/bottom own corners, matching the existing uniform rectangular border. */
export function borderRectangles(borders: ExpandedBorders, width: number, height: number): NodeDefinition[] {
  const nodes: NodeDefinition[] = [];
  const top = Math.min(height, borders.borderTop?.width ?? 0);
  const bottom = Math.min(height - top, borders.borderBottom?.width ?? 0);
  const sideHeight = height - top - bottom;
  const edges = [
    [borders.borderTop, 0, 0, width, top],
    [borders.borderBottom, 0, height - bottom, width, bottom],
    [borders.borderLeft, 0, top, Math.min(width, borders.borderLeft?.width ?? 0), sideHeight],
    [
      borders.borderRight,
      width - Math.min(width, borders.borderRight?.width ?? 0),
      top,
      Math.min(width, borders.borderRight?.width ?? 0),
      sideHeight,
    ],
  ] as const;
  for (const [edge, x, y, extent, depth] of edges)
    if (edge && extent > 0 && depth > 0)
      nodes.push({ type: "rect", x, y, width: extent, height: depth, paint: { fill: edge.color, stroke: null } });
  return nodes;
}
