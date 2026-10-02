import { fail } from "../core/error.js";
import { isVNode } from "./ownership.js";
import type { DeepReadonly } from "./types.js";

export const pointer = (key: PropertyKey): string => String(key).replaceAll("~", "~0").replaceAll("/", "~1");

export function dataRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected ordinary data props");
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("TYPE", path, "Class instances are not data props");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      fail("TYPE", `${path}/${pointer(key)}`, "Expected enumerable own data fields");
    }
  }
}

export function dataArray(value: unknown, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("TYPE", path, "Expected an ordinary array");
  if (value.length > 250000) fail("LIMIT", path, "Data array budget exceeded");
  if (Reflect.ownKeys(value).length !== value.length + 1) fail("TYPE", path, "Expected a dense data array");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("TYPE", `${path}/${i}`, "Expected enumerable data indices");
  }
}

interface CopyState {
  readonly active: Set<object>;
  units: number;
  chars: number;
}

function copy(value: unknown, path: string, depth: number, state: CopyState): unknown {
  if (depth > 128 || ++state.units > 250000) fail("LIMIT", path, "Data snapshot budget exceeded");
  if (isVNode(value)) return value;
  if (typeof value === "string") {
    state.chars += value.length;
    if (state.chars > 100000) fail("LIMIT", path, "Data snapshot text budget exceeded");
    return value;
  }
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value !== "object") fail("TYPE", path, "Callbacks, symbols and executable values are not data props");
  if (state.active.has(value)) fail("VDOM_CYCLE", path, "Cyclic data props");
  state.active.add(value);
  try {
    return copyContainer(value, path, depth, state);
  } finally {
    state.active.delete(value);
  }
}

function copyContainer(value: object, path: string, depth: number, state: CopyState): unknown {
  if (Array.isArray(value)) {
    dataArray(value, path);
    return Object.freeze(value.map((item: unknown, i: number) => copy(item, `${path}/${i}`, depth + 1, state)));
  }
  dataRecord(value, path);
  const result: Record<string, unknown> = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
  for (const key of Object.keys(value)) {
    Object.defineProperty(result, key, {
      enumerable: true,
      value: copy(value[key], `${path}/${pointer(key)}`, depth + 1, state),
    });
  }
  return Object.freeze(result);
}

export function snapshot<T>(value: T, path: string): DeepReadonly<T> {
  // Reassociate the generic type only after a descriptor-checked, shape-preserving
  // deep copy. No executable/class/accessor values survive this boundary.
  return copy(value, path, 0, { active: new Set(), units: 0, chars: 0 }) as DeepReadonly<T>;
}

export function keys(props: Readonly<Record<string, unknown>>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(props)) {
    if (!allowed.includes(key)) fail("KEY", `${path}/${pointer(key)}`, "Unsupported VDOM prop");
  }
}
