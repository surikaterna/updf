import { isContentData } from "../core/content-ownership.js";
import { snapshot as copyData, pointer } from "../core/data.js";
import { fail } from "../core/error.js";
import { isVNode } from "./ownership.js";
import type { DeepReadonly } from "./types.js";

export { dataArray, dataRecord, pointer } from "../core/data.js";

export function snapshot<T>(value: T, path: string, allowNodes = true): DeepReadonly<T> {
  const result = copyData(value, path, (value, path) => {
    if (!isVNode(value) && !isContentData(value)) return false;
    if (!allowNodes) fail("TYPE", path, "Context values cannot contain VDOM nodes");
    return true;
  });
  return result as DeepReadonly<T>;
}
export function keys(props: Readonly<Record<string, unknown>>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(props)) {
    if (!allowed.includes(key)) fail("KEY", `${path}/${pointer(key)}`, "Unsupported VDOM prop");
  }
}
