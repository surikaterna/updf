import type { MeasuredNode, MeasuredPaintGroup } from "../core/plan.js";
import { matrix, multiply } from "../painting/affine.js";
import { clip } from "../painting/read.js";
import type { PaintingGroupNode } from "../types.js";
import type { InkContext, MeasurementContext, PaintContext, ValidationContext, ValidationView } from "./context.js";
import { array } from "../core/schema.js";
import { fail } from "../core/error.js";
import { intersection, rectangle } from "../painting/bounds.js";
import { inPage } from "./geometry.js";
import { decimal as n } from "../core/pdf-values.js";
import { nativeFields } from "./native-fields.js";

export const paintGroupKeys = [
  "type",
  "children",
  "clip",
  "transform",
] as const satisfies readonly (keyof PaintingGroupNode)[];

export function measurePaintGroup(node: PaintingGroupNode, context: MeasurementContext): MeasuredPaintGroup {
  const clipping = clip(node.clip, `${context.path}/clip`);
  const children: MeasuredNode[] = [];
  context.schedule(node.children, children, `${context.path}/children`);
  return {
    type: "paintGroup",
    matrix: matrix(node.transform, `${context.path}/transform`),
    ...(clipping ? { clip: clipping } : {}),
    children,
  };
}

export function validatePaintGroup(node: Record<string, unknown>, context: ValidationContext): void {
  const { path, view } = context;
  const transform = multiply(view.matrix, matrix(node.transform, `${path}/transform`));
  if (("clip" in node && node.clip === undefined) || ("transform" in node && node.transform === undefined))
    fail("TYPE", path, "Omit optional fields instead of undefined");
  const clipping = clip(node.clip, `${path}/clip`);
  let region = view.clip;
  if (clipping) {
    const bounded = rectangle(clipping.x, clipping.y, clipping.width, clipping.height, transform);
    // A nested viewport may extend beyond its parent, but not a page-bounded ancestor clip.
    inPage(bounded, view, `${path}/clip`);
    region = region ? intersection(region, bounded) : bounded;
    if (!region) region = [0, 0, 0, 0];
  }
  array(node.children, context.budget.policy.nodes, `${path}/children`);
  const next: ValidationView = {
    width: view.width,
    height: view.height,
    matrix: transform,
    local: true,
    ...(region ? { clip: region } : {}),
  };
  context.scheduleChildren(node.children, next);
}

export function paintGroupInk(node: MeasuredPaintGroup, context: InkContext): void {
  const transform = multiply(context.transform, node.matrix);
  const localClip = node.clip && rectangle(node.clip.x, node.clip.y, node.clip.width, node.clip.height, transform);
  const nextClip = context.clip && localClip ? intersection(context.clip, localClip) : (context.clip ?? localClip);
  if (context.clip && localClip && !nextClip) return;
  context.schedule(node.children, transform, nextClip);
}

export function paintPaintGroup(node: MeasuredPaintGroup, context: PaintContext): void {
  context.push("q\n");
  if (!context.local) context.push(`1 0 0 -1 0 ${n(context.height)} cm\n`);
  context.push(`${node.matrix.map(n).join(" ")} cm\n`);
  if (node.clip)
    context.push(`${n(node.clip.x)} ${n(node.clip.y)} ${n(node.clip.width)} ${n(node.clip.height)} re W n\n`);
}

export function lowerPaintGroup(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  const fields = { ...props };
  delete fields.children;
  return { type: "paintGroup", ...nativeFields(fields, x, y, path, "matrix"), children: [] };
}
