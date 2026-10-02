import { finite } from "../core/schema.js";
import { type Point, point, stretch } from "./affine.js";
import type { Matrix, PathCommand, ResolvedPaint } from "./types.js";

export type Bounds = readonly [number, number, number, number];
export function union(a: Bounds | undefined, b: Bounds): Bounds {
  return a ? [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])] : b;
}
const at = (p: Point): Bounds => [p[0], p[1], p[0], p[1]];

function extrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const scale = Math.max(Math.abs(p0), Math.abs(p1), Math.abs(p2), Math.abs(p3));
  if (scale === 0) return [];
  const u0 = p0 / scale,
    u1 = p1 / scale,
    u2 = p2 / scale,
    u3 = p3 / scale;
  const a = -u0 + 3 * u1 - 3 * u2 + u3;
  const b = 2 * (u0 - 2 * u1 + u2);
  const c = u1 - u0;
  if (a === 0) return b === 0 ? [] : [-c / b].filter((t) => t > 0 && t < 1);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const q = -0.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant));
  return (q === 0 ? [-b / (2 * a)] : [q / a, c / q]).filter((t) => t > 0 && t < 1);
}
function evaluate(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const coordinate = (axis: 0 | 1) =>
    finite(u ** 3 * p0[axis] + 3 * u * u * t * p1[axis] + 3 * u * t * t * p2[axis] + t ** 3 * p3[axis], "/commands");
  return [coordinate(0), coordinate(1)];
}
function cubic(p0: Point, p1: Point, p2: Point, p3: Point): Bounds {
  let result = union(at(p0), at(p3));
  for (const t of [...extrema(p0[0], p1[0], p2[0], p3[0]), ...extrema(p0[1], p1[1], p2[1], p3[1])]) {
    result = union(result, at(evaluate(p0, p1, p2, p3, t)));
  }
  return result;
}

export function pathBounds(commands: readonly PathCommand[], matrix: Matrix, paint: ResolvedPaint): Bounds | undefined {
  let current: Point = [0, 0];
  let start = current;
  let result: Bounds | undefined;
  for (const command of commands) {
    if (command.type === "close") {
      if (current[0] !== start[0] || current[1] !== start[1]) result = union(result, union(at(current), at(start)));
      current = start;
      continue;
    }
    const end = point(matrix, command.x, command.y);
    if (command.type === "move") start = end;
    else if (command.type === "line") result = union(result, union(at(current), at(end)));
    else
      result = union(
        result,
        cubic(current, point(matrix, command.x1, command.y1), point(matrix, command.x2, command.y2), end),
      );
    current = end;
  }
  if (!result || (!paint.fill && (!paint.stroke || paint.width === 0))) return undefined;
  const cap = paint.lineCap === "square" ? Math.SQRT2 : 1;
  const join = paint.lineJoin === "miter" ? paint.miterLimit : 1;
  const pad =
    paint.stroke && paint.width ? finite((paint.width / 2) * Math.max(cap, join) * stretch(matrix), "/paint/width") : 0;
  return [
    finite(result[0] - pad, "/bounds"),
    finite(result[1] - pad, "/bounds"),
    finite(result[2] + pad, "/bounds"),
    finite(result[3] + pad, "/bounds"),
  ];
}
export function rectangle(x: number, y: number, width: number, height: number, m: Matrix): Bounds {
  const points = [point(m, x, y), point(m, x + width, y), point(m, x + width, y + height), point(m, x, y + height)];
  return points.reduce<Bounds>((bounds, p) => union(bounds, at(p)), at(points[0] ?? [0, 0]));
}
export function intersection(a: Bounds, b: Bounds): Bounds | undefined {
  const result: Bounds = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return result[0] > result[2] || result[1] > result[3] ? undefined : result;
}
