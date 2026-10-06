import type { NodeDefinition } from "../types.js";
import { dataRecord, pointer, scheduleArray } from "../core/data.js";
import { fail } from "../core/error.js";
import { isNativeNodeKind, nativeChildrenField } from "../nodes/metadata.js";
import { createNode } from "./create.js";
import type { VNode } from "./types.js";

/** Shallow routing only: recognized malformed nodes still require strict validation. */
export function isNativeNodeData(value: unknown): value is NodeDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const descriptor = Object.getOwnPropertyDescriptor(value, "type");
  return !!descriptor && "value" in descriptor && descriptor.enumerable === true && isNativeNodeKind(descriptor.value);
}

export function isNativeNodeDataArray(value: unknown): value is readonly NodeDefinition[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable || !isNativeNodeData(descriptor.value))
      return false;
  }
  return true;
}

function visit(
  value: unknown,
  path: string,
  assign: (node: VNode) => void,
  tasks: (() => void)[],
  active: Set<object>,
): void {
  dataRecord(value, path);
  const kind: unknown = value.type;
  if (!isNativeNodeKind(kind)) fail("TYPE", `${path}/type`, "Expected a native node type");
  if (active.has(value)) fail("VDOM_CYCLE", path, "Cyclic native node data");
  const childField = nativeChildrenField(kind);
  const props: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(value)) {
    if (key !== "type" && key !== childField) props[key] = value[key];
  }
  if (!childField) {
    assign(createNode(kind, props));
    return;
  }
  const children: VNode[] = [];
  active.add(value);
  tasks.push(() => {
    active.delete(value);
    assign(createNode(kind, { ...props, [childField]: children }));
  });
  scheduleArray(value[childField] as readonly unknown[], `${path}/${pointer(childField)}`, tasks, (child, index) => {
    visit(child, `${path}/${pointer(childField)}/${index}`, (node) => children.push(node), tasks, active);
  });
}

/** Trusted AST bridge, not a validator or sandbox. Lowering owns operation budgets and semantics. */
export function nativeNodeToVdom(node: NodeDefinition): VNode {
  const tasks: (() => void)[] = [];
  let result: VNode | undefined;
  visit(
    node,
    "",
    (owned) => {
      result = owned;
    },
    tasks,
    new Set(),
  );
  while (tasks.length) tasks.pop()?.();
  if (!result) fail("TYPE", "", "Expected a native node");
  return result;
}
