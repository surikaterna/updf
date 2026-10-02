import { array, commands, fail, finite, number } from "@updf/core/internal";
import type { PathCommand } from "@updf/core/painting";

export function polygon(points: readonly number[], close = true): readonly PathCommand[] {
  array(points, close ? 8190 : 8192, "/points");
  if (points.length % 2) fail("GEOMETRY", "/points", "Expected coordinate pairs");
  const result: PathCommand[] = [];
  for (let i = 0; i < points.length; i += 2)
    result.push({ type: i ? "line" : "move", x: finite(points[i], "/points"), y: finite(points[i + 1], "/points") });
  if (result.length && close) result.push({ type: "close" });
  return commands(result, "/points");
}
/** Independent standard four-cubic ellipse construction, not a copied SO answer. */
export function ellipse(cx: number, cy: number, rx: number, ry = rx): readonly PathCommand[] {
  finite(cx, "/ellipse");
  finite(cy, "/ellipse");
  number(rx, "/ellipse");
  number(ry, "/ellipse");
  if (!rx || !ry) return [];
  const k = (4 * (Math.sqrt(2) - 1)) / 3;
  return commands(
    [
      { type: "move", x: cx + rx, y: cy },
      { type: "cubic", x1: cx + rx, y1: cy + k * ry, x2: cx + k * rx, y2: cy + ry, x: cx, y: cy + ry },
      { type: "cubic", x1: cx - k * rx, y1: cy + ry, x2: cx - rx, y2: cy + k * ry, x: cx - rx, y: cy },
      { type: "cubic", x1: cx - rx, y1: cy - k * ry, x2: cx - k * rx, y2: cy - ry, x: cx, y: cy - ry },
      { type: "cubic", x1: cx + k * rx, y1: cy - ry, x2: cx + rx, y2: cy - k * ry, x: cx + rx, y: cy },
      { type: "close" },
    ],
    "/ellipse",
  );
}
