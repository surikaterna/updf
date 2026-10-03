import type { NodeDefinition } from "@updf/core";
import { fail, sum } from "@updf/core/internal";
import { containerTotals } from "./container-budget.js";
import type { FragmentPaintContext, PaintCall } from "./protocol.js";
import type { Sizing } from "./sizing.js";
import type { StackSelection } from "./stack.js";

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
  if (box.style.background) rect(0, 0, box.width, height, box.style.background);
  const border = box.style.border;
  if (border?.width) {
    rect(0, 0, box.width, border.width, border.color);
    rect(0, height - border.width, box.width, border.width, border.color);
    rect(0, border.width, border.width, height - 2 * border.width, border.color);
    rect(box.width - border.width, border.width, border.width, height - 2 * border.width, border.color);
  }
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
  const border = box.style.border?.width ?? 0;
  context.budget.apply(containerTotals(box, height, hidden), path);
  const content: NodeDefinition[] = [];
  for (const piece of selection.pieces) {
    const y = sum([box.inset.top, piece.top]);
    if (!hidden && y + piece.fragment.height > height - box.inset.bottom)
      fail("GEOMETRY", path, "Materialized child exceeds its reserved content region");
    const nodes = yield {
      fragment: piece.fragment,
      context: {
        x: box.inset.left,
        y,
        budget: context.budget,
        start: (offset, extent) => {
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
  const children: NodeDefinition[] = outside.splice(0, box.style.background ? 1 : 0);
  if (hidden)
    children.push({
      type: "paintGroup",
      clip: { x: border, y: border, width: box.width - 2 * border, height: height - 2 * border },
      children: content,
    });
  else for (const node of content) children.push(node);
  for (const node of outside) children.push(node);
  return [{ type: "paintGroup", transform: [1, 0, 0, 1, context.x, context.y], children }];
}
