import type { LayoutOperation } from "@updf/core/internal";

const operations = new WeakMap<LayoutOperation, string[]>();
export function ancestors(operation: LayoutOperation): readonly string[] {
  return Object.freeze([...(operations.get(operation) ?? [])]);
}
export function withAdapter<T>(operation: LayoutOperation, name: string, callback: () => T): T {
  const stack = operations.get(operation) ?? [];
  operations.set(operation, stack);
  stack.push(name);
  try {
    return callback();
  } finally {
    stack.pop();
  }
}
