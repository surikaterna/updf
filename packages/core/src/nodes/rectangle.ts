import type { MeasuredRectangle } from "../core/plan.js";
import type { RectangleNode } from "../types.js";
import { collectDrawing, drawingInk, hasDrawingPolicy, measureDrawing, validateDrawing } from "./drawing.js";
import type { CollectionContext, InkContext, PaintContext, ValidationContext } from "./context.js";
import { decimal as n } from "../core/pdf-values.js";
import { box } from "./geometry.js";
import { nativeFields } from "./native-fields.js";

export const rectangleKeys = [
  "type",
  "x",
  "y",
  "width",
  "height",
  "paint",
  "transform",
] as const satisfies readonly (keyof RectangleNode)[];

export function measureRectangle(node: RectangleNode, path: string): MeasuredRectangle {
  return measureDrawing(node, path);
}

export function validateRectangle(node: Record<string, unknown>, context: ValidationContext): void {
  context.reserveCommands(5);
  if (hasDrawingPolicy(node, context)) validateDrawing(node, context);
  else box(node, context.view, context.path, true);
}

export function rectangleInk(node: MeasuredRectangle, context: InkContext): void {
  drawingInk(node, context);
}

export function collectRectangle(node: MeasuredRectangle, context: CollectionContext): void {
  collectDrawing(node, context);
}

export function paintRectangle(node: MeasuredRectangle, context: PaintContext): void {
  if (node.painting) {
    context.drawing(node.painting).forEach(context.push);
    return;
  }
  context.push(
    context.local
      ? `q\n0 0 0 RG\n0.5 w\n${n(node.x)} ${n(node.y)} ${n(node.width)} ${n(node.height)} re S\nQ\n`
      : `${n(node.x)} ${n(context.height - node.y - node.height)} ${n(node.width)} ${n(node.height)} re S\n`,
  );
}

export function lowerRectangle(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "rect", ...nativeFields(props, x, y, path, "position") };
}

export function rectangleWork() {
  return { commands: 5, points: 0 };
}
