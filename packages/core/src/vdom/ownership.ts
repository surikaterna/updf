import { isExecutableNode, ownExecutableNode } from "../core/node-ownership.js";
import type { VNode } from "./types.js";

export function ownNode<T extends VNode>(node: T): T {
  return ownExecutableNode(node);
}

export function isVNode(value: unknown): value is VNode {
  return isExecutableNode(value);
}
