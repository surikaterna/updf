// Identity alone crosses the data boundary; this store has no component code or render state.
const nodes = new WeakSet<object>();
export function ownExecutableNode<T extends object>(node: T): T {
  nodes.add(node);
  return Object.freeze(node);
}
export function isExecutableNode(value: unknown): boolean {
  return typeof value === "object" && value !== null && nodes.has(value);
}
