import { drawing } from "../painting/read.js";
import type { LineNode, RectangleNode } from "../types.js";
import { multiply } from "../painting/affine.js";
import { pathBounds } from "../painting/bounds.js";
import type { CollectionContext, InkContext, ValidationContext } from "./context.js";
import type { MeasuredLineNode, MeasuredPath, MeasuredRectangle } from "../core/plan.js";
import { inPage } from "./geometry.js";

export function measureDrawing<T extends RectangleNode | LineNode>(node: T, path: string) {
  return node.paint !== undefined || node.transform !== undefined
    ? { ...node, painting: drawing({ ...node }, path) }
    : { ...node };
}

export function validateDrawing(node: Record<string, unknown>, context: ValidationContext): void {
  const geometry = drawing(node, context.path);
  inPage(
    pathBounds(geometry.commands, multiply(context.view.matrix, geometry.matrix), geometry.paint),
    context.view,
    context.path,
  );
}

export function hasDrawingPolicy(node: Record<string, unknown>, context: ValidationContext): boolean {
  return "paint" in node || "transform" in node || context.view.local;
}

export function drawingInk(node: MeasuredRectangle | MeasuredLineNode | MeasuredPath, context: InkContext): void {
  const painting = node.painting ?? drawing({ ...node }, "");
  const paint = {
    ...painting.paint,
    fill: painting.paint.fillOpacity === 0 ? null : painting.paint.fill,
    stroke: painting.paint.strokeOpacity === 0 ? null : painting.paint.stroke,
  };
  context.addBounds(pathBounds(painting.commands, multiply(context.transform, painting.matrix), paint));
}

export function collectDrawing(
  node: MeasuredRectangle | MeasuredLineNode | MeasuredPath,
  context: CollectionContext,
): void {
  if (node.painting)
    for (const provider of context.providers) provider.collectDrawing?.(node.painting, context.collection);
}
