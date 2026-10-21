import type { NodeDefinition } from "@updf/core";
import { borderRectangles } from "./border-rectangles.js";
import { containerTotals } from "./container-budget.js";
import type { FragmentPaintContext, PaintCall } from "./protocol.js";
import type { Sizing } from "./sizing.js";

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
  for (const child of context.children) {
    const nodes = yield child;
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
