import type { NodeKind } from "./context.js";
import type { NodeDefinition } from "../types.js";

type ChildField<K extends NodeKind> =
  Extract<NodeDefinition, { type: K }> extends { children: readonly NodeDefinition[] } ? "children" : undefined;

const inventory = {
  richText: undefined,
  rect: undefined,
  line: undefined,
  path: undefined,
  paintGroup: "children",
  xObject: undefined,
} satisfies { [K in NodeKind]: ChildField<K> };
export const nativeNodeKinds = Object.freeze(Object.keys(inventory) as NodeKind[]);

export function isNativeNodeKind(value: unknown): value is NodeKind {
  return typeof value === "string" && Object.hasOwn(inventory, value);
}

export function nativeChildrenField(kind: NodeKind): "children" | undefined {
  return inventory[kind];
}
