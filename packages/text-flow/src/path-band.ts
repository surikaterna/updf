import { DocumentError, fail, number, validateDataObject } from "@updf/core/internal";
import type { PathCommand } from "@updf/core/painting";
import { parsePathData } from "@updf/geometry";
import { bits, dyadic, successor, value } from "@updf/layout-boxes/numeric";
import { conservativeSegmentDepth } from "@updf/text/internal-interpolation";

export type SideShape = "rect" | string | { readonly d: string; readonly fillRule?: "nonzero" | "evenodd" };
export interface PathShape {
  readonly d: string;
  readonly fillRule: "nonzero" | "evenodd";
  readonly dataPath?: string;
}
interface Point {
  readonly x: number;
  readonly y: number;
}
type Edge = readonly [Point, Point];
export type Charge = (amount: number) => void;
export interface PathBand {
  readonly commands: readonly PathCommand[];
  readonly depth: (top: number, bottom: number) => number;
}
export function pathShape(input: unknown, path: string): PathShape | undefined {
  if (input === undefined || input === "rect") return undefined;
  const object = typeof input === "string" ? { d: input } : input;
  validateDataObject(object, ["d", "fillRule"], path);
  const dataPath = typeof input === "string" ? path : `${path}/d`;
  if (typeof object.d !== "string") fail("TYPE", dataPath, "Expected SVG path data, not a resource URL");
  const fillRule = Object.hasOwn(object, "fillRule") ? object.fillRule : "nonzero";
  if (fillRule !== "nonzero" && fillRule !== "evenodd") fail("VALUE", `${path}/fillRule`, "Unknown path fill rule");
  return Object.freeze({ d: object.d, fillRule, dataPath });
}
export function authoredGeometry<T>(read: () => T, root: string, path: string): T {
  try {
    return read();
  } catch (error) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic || (diagnostic.path !== root && !diagnostic.path.startsWith(`${root}/`))) throw error;
    throw new DocumentError(diagnostic.code, path + diagnostic.path.slice(root.length), diagnostic.message, diagnostic);
  }
}
/** Outward reflection, not an approximate fit allowance. Zero is an exact endpoint. */
function reflected(width: number, x: number): number {
  const n = width - x;
  if (x === 0 || x === width) return n;
  const next = successor(bits(n));
  return Math.min(width, next === undefined ? Infinity : value(next));
}
export function preparePathBand(
  shape: PathShape,
  width: number,
  height: number,
  side: "left" | "right",
  charge: Charge,
  path: string,
): PathBand {
  // Parser has separate finite scanner/command caps. Charge input once before parsing;
  // normalized visits and retained edges are separate work, not a second input scan.
  charge(shape.d.length + 1);
  const commands = authoredGeometry(() => parsePathData(shape.d), "/path", shape.dataPath ?? `${path}/d`);
  charge(commands.length);
  const edges = closedEdges(commands, width, height, charge, path);
  charge(edges.length * 3);
  const projected = edges.map(
    ([a, b]): Edge => [
      { x: side === "left" ? a.x : reflected(width, a.x), y: a.y },
      { x: side === "left" ? b.x : reflected(width, b.x), y: b.y },
    ],
  );
  return Object.freeze({
    commands,
    depth: (top: number, bottom: number) => {
      charge(1 + projected.length);
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom < top)
        fail("GEOMETRY", path, "Invalid path query band");
      let depth = 0;
      for (const edge of projected) depth = Math.max(depth, edgeDepth(edge, top, bottom));
      return depth;
    },
  });
}
function closedEdges(commands: readonly PathCommand[], width: number, height: number, charge: Charge, path: string) {
  const edges: Edge[] = [];
  let start: Point | undefined, last: Point | undefined;
  let points: Point[] = [];
  for (const command of commands) {
    charge(1);
    if (command.type === "cubic") fail("GEOMETRY", path, "Side paths must contain straight segments only");
    if (command.type === "close") {
      charge(points.length * 3);
      if (!start || !last || !noncollinear(points)) fail("GEOMETRY", path, "Expected nondegenerate closed subpath");
      charge(1);
      edges.push([last, start]);
      start = last = undefined;
      points = [];
      continue;
    }
    const point = checkedPoint(command, width, height, path);
    if (command.type === "move") {
      if (start) fail("GEOMETRY", path, "Open side subpath");
      start = point;
    } else {
      if (!last) fail("GEOMETRY", path, "Line outside subpath");
      charge(1);
      edges.push([last, point]);
    }
    points.push(point);
    last = point;
  }
  if (start || !edges.length) fail("GEOMETRY", path, "Expected nonempty closed path");
  return Object.freeze(edges);
}
function checkedPoint(point: Point, width: number, height: number, path: string): Point {
  number(point.x, path);
  number(point.y, path);
  if (point.x > width || point.y > height) fail("GEOMETRY", path, "Path exceeds resolved local Block dimensions");
  return point;
}
function noncollinear(points: readonly Point[]): boolean {
  const exact = points.map((p) => ({ x: dyadic(bits(p.x)), y: dyadic(bits(p.y)) }));
  const a = exact[0]!;
  const b = exact.find((p) => p.x !== a.x || p.y !== a.y);
  if (!b) return false;
  return exact.some((p) => (b.x - a.x) * (p.y - a.y) !== (b.y - a.y) * (p.x - a.x));
}
function edgeDepth([p, q]: Edge, top: number, bottom: number): number {
  const a = p.y <= q.y ? p : q,
    b = p.y <= q.y ? q : p;
  if (top > b.y || bottom < a.y) return 0;
  if (a.y === b.y) return Math.max(a.x, b.x);
  const low = Math.max(top, a.y),
    high = Math.min(bottom, b.y);
  return Math.max(conservativeSegmentDepth(a, b, low), conservativeSegmentDepth(a, b, high));
}
