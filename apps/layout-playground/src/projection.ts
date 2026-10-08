import type { SourceNode } from "./boxes.js";
import type { AcceptedLine } from "./pdf.js";
import type { Region, Snapshot } from "./snapshot.js";

export const OUTER_MARGIN = 20;
export interface Rect {
  readonly id: string;
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly content: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}
export interface ProjectedPage {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly rectangles: readonly Rect[];
  readonly lines: readonly (AcceptedLine & { readonly id: string; readonly lineIndex: number })[];
}
export interface Projection {
  readonly snapshot: Snapshot;
  readonly pages: readonly ProjectedPage[];
}

export function project(snapshot: Snapshot): Projection {
  return Object.freeze({ snapshot, pages: Object.freeze(snapshot.regions.map(projectRegion)) });
}

function projectRegion(region: Region): ProjectedPage {
  const rectangles: Rect[] = [];
  const lines: ProjectedPage["lines"][number][] = [];
  for (const placement of region.placements) {
    const { unit } = placement;
    if (unit.line)
      lines.push(
        Object.freeze({
          id: unit.id,
          line: unit.line,
          lineIndex: unit.lineIndex ?? 0,
          x: OUTER_MARGIN + placement.x,
          y: OUTER_MARGIN + placement.y,
          width: placement.width,
        }),
      );
    if (unit.layout && unit.root) {
      rectangles.push(
        ...projectBoxes(unit.root, unit.layout.boxes, OUTER_MARGIN + placement.x, OUTER_MARGIN + placement.y),
      );
    }
  }
  return Object.freeze({
    id: region.id,
    width: region.width + 2 * OUTER_MARGIN,
    height: region.height + 2 * OUTER_MARGIN,
    rectangles: Object.freeze(rectangles),
    lines: Object.freeze(lines),
  });
}

function sourceIndex(root: SourceNode): ReadonlyMap<string, SourceNode> {
  const nodes = new Map<string, SourceNode>();
  const pending = [root];
  while (pending.length) {
    const item = pending.pop();
    if (!item) break;
    nodes.set(item.id, item);
    pending.push(...item.children);
  }
  return nodes;
}

function projectBoxes(
  root: SourceNode,
  boxes: import("@updf/layout-boxes/boxes").BoxLayout<never>["boxes"],
  originX: number,
  originY: number,
): readonly Rect[] {
  const nodes = sourceIndex(root);
  const result: Rect[] = [];
  for (const box of boxes) {
    const parent = box.parentIndex === null ? undefined : result[box.parentIndex];
    const style = nodes.get(box.id)?.style;
    const x = (parent?.content.x ?? originX) + box.left;
    const y = (parent?.content.y ?? originY) + box.top;
    const left = style?.paddingLeft ?? 0,
      top = style?.paddingTop ?? 0;
    result.push(
      Object.freeze({
        id: box.id,
        path: box.path,
        x,
        y,
        width: box.width,
        height: box.height,
        content: Object.freeze({
          x: x + left,
          y: y + top,
          width: box.width - left - (style?.paddingRight ?? 0),
          height: box.height - top - (style?.paddingBottom ?? 0),
        }),
      }),
    );
  }
  return Object.freeze(result);
}
