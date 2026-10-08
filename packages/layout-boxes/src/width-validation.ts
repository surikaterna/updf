import { fail } from "./error.js";

const pointer = (key: PropertyKey): string => String(key).replaceAll("~", "~0").replaceAll("/", "~1");
export function record(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected a plain data object");
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail("TYPE", path, "Expected a plain data object");
  const data: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !keys.includes(key)) fail("KEY", `${path}/${pointer(key)}`, "Unsupported key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable)
      fail("TYPE", `${path}/${pointer(key)}`, "Expected enumerable own data property");
    data[key] = descriptor.value;
  }
  return data;
}
export function array(value: unknown, max: number, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("TYPE", path, "Expected an ordinary array");
  if (value.length > max) fail("LIMIT", path, `Maximum length is ${max}`);
  if (Reflect.ownKeys(value).length !== value.length + 1) fail("TYPE", path, "Dense data arrays only");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable)
      fail("TYPE", `${path}/${i}`, "Dense enumerable data arrays only");
  }
}
export function number(value: unknown, path: string, positive = false): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail("GEOMETRY", path, "Expected a finite number");
  if (value < 0 || (positive && value === 0))
    fail("GEOMETRY", path, positive ? "Expected positive number" : "Expected nonnegative number");
  return value;
}
export function trackLimit(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
    fail("LIMIT", path, `Track count budget limit exceeded (maximum ${Number.MAX_SAFE_INTEGER})`);
}
