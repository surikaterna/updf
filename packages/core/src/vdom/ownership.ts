import type { VNode } from "./types.js";

// Ownership branding is not a registry/cache of component results or render state.
const nodes = new WeakSet<object>();

export function ownNode<T extends VNode>(node: T): T {
  nodes.add(node);
  return Object.freeze(node);
}

export function isVNode(value: unknown): value is VNode {
  return typeof value === "object" && value !== null && nodes.has(value);
}
