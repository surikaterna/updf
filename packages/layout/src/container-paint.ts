import type { NodeDefinition } from "@updf/core";
import { fail, sum } from "@updf/core/internal";
import { borderRectangles } from "./border-rectangles.js";
import { containerTotals } from "./container-budget.js";
import { assertGeneratedPart, generatedFragmentStart, materializeGeneratedInterval } from "./generated-interval.js";
import type { FragmentPaintContext, PaintCall } from "./protocol.js";
import type { Sizing } from "./sizing.js";
import type { StackPiece, StackSelection } from "./stack.js";

function decoration(box: Sizing, height: number): NodeDefinition[] {
  if (!height) return [];
  const nodes: NodeDefinition[] = [];
  const rect = (
    x: number,
    y: number,
    width: number,
    extent: number,
    color: readonly [number, number, number],
  ): void => {
    if (width > 0 && extent > 0)
      nodes.push({ type: "rect", x, y, width, height: extent, paint: { fill: color, stroke: null } });
  };
  if (box.style.backgroundColor) rect(0, 0, box.width, height, box.style.backgroundColor);
  nodes.push(...borderRectangles(box.borders, box.width, height));
  return nodes;
}
export function* paintContainerSteps(
  box: Sizing,
  selection: StackSelection,
  height: number,
  hidden: boolean,
  context: FragmentPaintContext,
  path: string,
): Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]> {
  if (height === 0) return [];
  const outside = decoration(box, height);
  const top = box.borders.borderTop?.width ?? 0;
  const right = box.borders.borderRight?.width ?? 0;
  const bottom = box.borders.borderBottom?.width ?? 0;
  const left = box.borders.borderLeft?.width ?? 0;
  context.budget.apply(containerTotals(box, height, hidden), path);
  const content: NodeDefinition[] = [];
  for (const piece of selection.pieces) {
    const y = sum([box.inset.top, piece.top]);
    if (!hidden) checkPiece(piece, box.inset.top, selection.height, height - box.inset.bottom, path);
    const nodes = yield {
      fragment: piece.fragment,
      context: {
        x: sum([box.inset.left, piece.left ?? 0]),
        y,
        budget: context.budget,
        start: (offset, extent, certificate) => {
          if (!hidden && certificate)
            return generatedFragmentStart(piece.fragment, certificate, y, offset, extent, path);
          const start = sum([y, offset]);
          if (!hidden && (start < y || start + extent > y + piece.fragment.height))
            fail("GEOMETRY", path, "Materialized child part exceeds its fragment reservation");
          return start;
        },
      },
    };
    for (const node of nodes) content.push(node);
  }
  // Background is beneath ink; only border rectangles remain for the foreground layer.
  const children: NodeDefinition[] = outside.splice(0, box.style.backgroundColor ? 1 : 0);
  if (hidden)
    children.push({
      type: "paintGroup",
      clip: { x: left, y: top, width: box.width - left - right, height: height - top - bottom },
      children: content,
    });
  else for (const node of content) children.push(node);
  for (const node of outside) children.push(node);
  return [{ type: "paintGroup", transform: [1, 0, 0, 1, context.x, context.y], children }];
}

function checkPiece(piece: StackPiece, origin: number, sourceEnd: number, end: number, path: string): void {
  if (piece.interval) assertGeneratedPart(piece, piece.interval, piece.top, piece.fragment.height, path);
  const allocation = piece.interval
    ? materializeGeneratedInterval(piece.interval, origin, { sourceStart: 0, sourceEnd }, path)
    : undefined;
  const nativeEnd = allocation
    ? allocation.start + allocation.allocationExtent
    : sum([origin, piece.top]) + piece.fragment.height;
  if (nativeEnd > end) fail("GEOMETRY", path, "Materialized child exceeds its reserved content region");
}
