import type { MeasuredPath } from "../core/plan.js";
import { drawing } from "../painting/read.js";
import type { PathNode } from "../types.js";
import { array } from "../core/schema.js";
import type { CollectionContext, InkContext, PaintContext, ValidationContext } from "./context.js";
import { collectDrawing, drawingInk, validateDrawing } from "./drawing.js";
import { nativeFields } from "./native-fields.js";

export const pathKeys = ["type", "commands", "paint", "transform"] as const satisfies readonly (keyof PathNode)[];

export function measurePath(node: PathNode, path: string): MeasuredPath {
  return { ...node, painting: drawing({ ...node }, path) };
}

export function validatePath(node: Record<string, unknown>, context: ValidationContext): void {
  array(node.commands, context.remainingCommands, `${context.path}/commands`);
  context.reserveCommands(node.commands.length);
  validateDrawing(node, context);
}

export function pathInk(node: MeasuredPath, context: InkContext): void {
  drawingInk(node, context);
}

export function collectPath(node: MeasuredPath, context: CollectionContext): void {
  collectDrawing(node, context);
}

export function paintPath(node: MeasuredPath, context: PaintContext): void {
  context.drawing(node.painting).forEach(context.push);
}

export function lowerPath(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "path", ...nativeFields(props, x, y, path, "matrix") };
}

export function pathWork(props: Readonly<Record<string, unknown>>) {
  return { commands: Array.isArray(props.commands) ? props.commands.length : 0, points: 0 };
}
