import { fail } from "../core/error.js";
import type { FontBounds } from "./types.js";

export const fontLimits = Object.freeze({
  mappings: 0x110000 - 0x800,
});
export const pointer = (key: PropertyKey): string => String(key).replaceAll("~", "~0").replaceAll("/", "~1");

export function record(
  value: unknown,
  path: string,
  allowed?: readonly string[],
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("FONT_DATA", path, "Expected ordinary font data");
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail("FONT_DATA", path, "Font data cannot be class instances");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      !descriptor ||
      !("value" in descriptor) ||
      !descriptor.enumerable ||
      (allowed && !allowed.includes(key))
    ) {
      fail("FONT_DATA", `${path}/${pointer(key)}`, "Expected supported enumerable own data fields");
    }
  }
}

export function array(value: unknown, maximum: number, path: string): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    fail("FONT_DATA", path, "Expected ordinary font data array");
  if (value.length > maximum) fail("LIMIT", path, "Font data array limit exceeded");
  if (Reflect.ownKeys(value).length !== value.length + 1) fail("FONT_DATA", path, "Expected dense font data array");
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      fail("FONT_DATA", `${path}/${i}`, "Expected own font array data");
  }
}

export function numeric(value: unknown, path: string, low: number, high: number, integer = true): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < low ||
    value > high ||
    (integer && !Number.isInteger(value))
  ) {
    fail("FONT_DATA", path, `Expected ${integer ? "integer" : "number"} in ${low}..${high}`);
  }
  return value;
}

export function bounds(value: unknown, path: string): FontBounds {
  array(value, 4, path);
  if (value.length !== 4) fail("FONT_DATA", path, "Expected four ink bounds");
  const result: FontBounds = [
    numeric(value[0], `${path}/0`, -32768, 32767),
    numeric(value[1], `${path}/1`, -32768, 32767),
    numeric(value[2], `${path}/2`, -32768, 32767),
    numeric(value[3], `${path}/3`, -32768, 32767),
  ];
  if (result[0] > result[2] || result[1] > result[3]) fail("FONT_DATA", path, "Inverted ink bounds");
  return Object.freeze(result);
}

export function byteLength(bytes: unknown, path: string, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!(bytes instanceof Uint8Array) || Object.getPrototypeOf(bytes) !== Uint8Array.prototype)
    fail("FONT_DATA", path, "Expected ordinary Uint8Array bytes");
  // Read intrinsic backing state, never a caller-shadowed getter/method/species.
  const size: unknown = Reflect.get(Uint8Array.prototype, "byteLength", bytes);
  const buffer: unknown = Reflect.get(Uint8Array.prototype, "buffer", bytes);
  if (!(buffer instanceof ArrayBuffer) || typeof size !== "number" || size < 1)
    fail("FONT_DATA", path, "Expected nonempty non-shared byte storage");
  if (size > maximum) fail("LIMIT", path, "Font program byte limit exceeded");
  return size;
}
