import type { FlowBlock } from "./types.js";

const bodies = new WeakMap<object, () => FlowBlock[]>();

export function deferColumnBody(column: object, expand: () => FlowBlock[]): void {
  bodies.set(column, expand);
}

export function columnBody(column: Record<string, unknown>): readonly unknown[] {
  const expand = bodies.get(column);
  if (!expand) return column.children as readonly unknown[];
  const children = expand();
  bodies.delete(column);
  return children;
}
