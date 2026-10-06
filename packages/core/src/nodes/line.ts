import type { MeasuredLineNode } from "../core/plan.js";
import type { LineNode } from "../types.js";
import { collectDrawing, drawingInk, hasDrawingPolicy, measureDrawing, validateDrawing } from "./drawing.js";
import { fail } from "../core/error.js";
import { finite, number } from "../core/schema.js";
import { pathBounds } from "../painting/bounds.js";
import { drawing } from "../painting/read.js";
import type { CollectionContext, InkContext, PaintContext, ValidationContext } from "./context.js";
import { decimal as n } from "../core/pdf-values.js";
import { inPage } from "./geometry.js";
import { nativeFields } from "./native-fields.js";

export const lineKeys = [
  "type",
  "x",
  "y",
  "x2",
  "y2",
  "paint",
  "transform",
] as const satisfies readonly (keyof LineNode)[];

export function measureLine(node: LineNode, path: string): MeasuredLineNode {
  return measureDrawing(node, path);
}

export function validateLine(node: Record<string, unknown>, context: ValidationContext): void {
  context.reserveCommands(2);
  if (hasDrawingPolicy(node, context)) {
    validateDrawing(node, context);
    return;
  }
  const { view, path } = context;
  const coordinate = view.local ? finite : number;
  const x = coordinate(node.x, `${path}/x`);
  const y = coordinate(node.y, `${path}/y`);
  const x2 = coordinate(node.x2, `${path}/x2`);
  const y2 = coordinate(node.y2, `${path}/y2`);
  if (x === x2 && y === y2) fail("GEOMETRY", path, "Line must have positive length");
  const geometry = drawing(node, path);
  // Legacy line behavior validates endpoints only, not conservative stroke padding.
  const paint = { ...geometry.paint, stroke: null, fill: [0, 0, 0] as const };
  inPage(pathBounds(geometry.commands, view.matrix, paint), view, path);
}

export function lineInk(node: MeasuredLineNode, context: InkContext): void {
  drawingInk(node, context);
}

export function collectLine(node: MeasuredLineNode, context: CollectionContext): void {
  collectDrawing(node, context);
}

export function paintLine(node: MeasuredLineNode, context: PaintContext): void {
  if (node.painting) {
    context.drawing(node.painting).forEach(context.push);
    return;
  }
  context.push(
    context.local
      ? `q\n0 0 0 RG\n0.5 w\n${n(node.x)} ${n(node.y)} m ${n(node.x2)} ${n(node.y2)} l S\nQ\n`
      : `${n(node.x)} ${n(context.height - node.y)} m ${n(node.x2)} ${n(context.height - node.y2)} l S\n`,
  );
}

export function lowerLine(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "line", ...nativeFields(props, x, y, path, "endpoints") };
}

export function lineWork() {
  return { commands: 2, points: 0 };
}
