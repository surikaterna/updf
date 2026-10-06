import type { XObjectNode } from "../types.js";
import { DocumentError, fail } from "../core/error.js";
import type { OwnedResource } from "../core/owned-resource.js";
import type { MeasuredXObject } from "../core/plan.js";
import type { CollectionContext, InkContext, PaintContext, ValidationContext } from "./context.js";
import { box } from "./geometry.js";
import { rectangle } from "../painting/bounds.js";
import { finite } from "../core/schema.js";
import { decimal as n, name, value } from "../core/pdf-values.js";
import { nativeFields } from "./native-fields.js";

export const xObjectKeys = [
  "type",
  "x",
  "y",
  "width",
  "height",
  "resource",
] as const satisfies readonly (keyof XObjectNode)[];

export function measureXObject(
  node: XObjectNode,
  path: string,
  bindings: ReadonlyMap<string, OwnedResource>,
): MeasuredXObject {
  const owned = bindings.get(node.resource);
  if (!owned) fail("RESOURCE", `${path}/resource`, "Missing named XObject resource");
  return { ...node, owned, path: `${path}/resource` };
}

export function validateXObject(node: Record<string, unknown>, context: ValidationContext): void {
  box(node, context.view, context.path, true, true);
  if (typeof node.resource !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(node.resource))
    fail("RESOURCE", `${context.path}/resource`, "Expected a named resource id");
}

export function xObjectInk(node: MeasuredXObject, context: InkContext): void {
  context.addBounds(rectangle(node.x, node.y, node.width, node.height, context.transform));
}

export function collectXObject(node: MeasuredXObject, context: CollectionContext): void {
  try {
    for (const provider of context.providers)
      provider.collectXObject?.({ identity: node, resource: node.owned, path: node.path }, context.collection);
    if (!context.hasPainting(node, context.xObjectSlot)) fail("RESOURCE", node.path, "No provider bound the XObject");
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    fail("RESOURCE", node.path, "Invalid or conflicting XObject binding");
  }
}

export function paintXObject(node: MeasuredXObject, context: PaintContext): void {
  const key = context.xObjectKey(node);
  const y = finite(context.local ? node.y + node.height : context.height - node.y - node.height, node.path);
  context.push(
    `q\n${n(node.width)} 0 0 ${n(context.local ? -node.height : node.height)} ${n(node.x)} ${n(y)} cm\n${value(name(key))} Do\nQ\n`,
  );
}

export function lowerXObject(props: Readonly<Record<string, unknown>>, x: number, y: number, path: string) {
  return { type: "xObject", ...nativeFields(props, x, y, path, "position") };
}
