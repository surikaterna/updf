import { fail } from "./error.js";

const pointer = (key: PropertyKey): string => String(key).replaceAll("~", "~0").replaceAll("/", "~1");
export function record(
  value: unknown,
  keys: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected a plain data object");
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail("TYPE", path, "Expected a plain data object");
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !keys.includes(key)) fail("KEY", `${path}/${pointer(key)}`, "Unsupported key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("TYPE", `${path}/${pointer(key)}`, "Expected enumerable own data property");
  }
}
export function array(value: unknown, max: number, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("TYPE", path, "Expected an ordinary array");
  if (value.length > max) fail("LIMIT", path, `Maximum length is ${max}`);
  if (Reflect.ownKeys(value).length !== value.length + 1) fail("TYPE", path, "Dense data arrays only");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("TYPE", `${path}/${i}`, "Dense enumerable data arrays only");
  }
}
export function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail("GEOMETRY", path, "Expected a finite number");
  return value;
}
export function number(value: unknown, path: string, positive = false): number {
  const result = finite(value, path);
  if (result < 0 || (positive && result === 0))
    fail("GEOMETRY", path, positive ? "Expected positive number" : "Expected nonnegative number");
  return result;
}
