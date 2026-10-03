import { DocumentError } from "@updf/core";

export function error(
  path: string,
  message: string,
  code: "TYPE" | "GEOMETRY" | "KEY" | "VDOM_HIERARCHY" | "LAYOUT_OVERSIZED" = "TYPE",
): never {
  throw new DocumentError(code, path, message);
}
export function record(
  value: unknown,
  keys: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) error(path, "Expected data record");
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) error(path, "Expected ordinary data record");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !descriptor || !("value" in descriptor) || !descriptor.enumerable)
      error(path, "Expected own data fields");
    if (!keys.includes(key)) error(`${path}/${key}`, "Unsupported field", "KEY");
    if (descriptor.value === undefined) error(`${path}/${key}`, "Omit undefined fields");
  }
}
export function array(value: unknown, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) error(path, "Expected ordinary array");
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      error(`${path}/${index}`, "Expected dense data indices");
  }
  if (Reflect.ownKeys(value).length !== value.length + 1) error(path, "Expected dense array without extra fields");
}
export function number(value: unknown, path: string, positive = false): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || (positive ? value <= 0 : value < 0))
    error(path, "Expected finite nonnegative geometry", "GEOMETRY");
}
export function rgb(value: unknown, path: string): void {
  array(value, path);
  if (value.length !== 3) error(path, "Expected RGB");
  for (const channel of value) {
    number(channel, path);
    if (channel > 1) error(path, "Expected RGB channels in [0,1]");
  }
}
