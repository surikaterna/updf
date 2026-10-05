import { isOwnedResource } from "../core/owned-resource.js";
import { isVNode } from "./ownership.js";

/** Compare owned immutable data, preserving key order, observable shapes and opaque handle identity. */
export function sameData(left: unknown, right: unknown): boolean {
  const pairs: [unknown, unknown][] = [[left, right]];
  while (pairs.length) {
    const pair = pairs.pop();
    if (!pair) break;
    const [a, b] = pair;
    if (Object.is(a, b)) continue;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
    if (isVNode(a) || isVNode(b) || isOwnedResource(a) || isOwnedResource(b)) return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    const keys = Object.keys(a);
    const rightKeys = Object.keys(b);
    if (keys.length !== rightKeys.length || keys.some((key, index) => key !== rightKeys[index])) return false;
    for (const key of keys) {
      pairs.push([Reflect.get(a, key), Reflect.get(b, key)]);
    }
  }
  return true;
}
