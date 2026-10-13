export type AssetErrorCode = "TYPE" | "VALUE" | "LIMIT" | "LOAD";

/** Transport/input failure; format adapters translate this into their own diagnostic domain. */
export class AssetError extends Error {
  constructor(
    readonly code: AssetErrorCode,
    readonly path: string,
    message: string,
  ) {
    super(message);
    this.name = "AssetError";
  }
}
export function fail(code: AssetErrorCode, path: string, message: string): never {
  throw new AssetError(code, path, message);
}
export function record(
  value: unknown,
  keys: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected data options");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail("TYPE", path, "Expected ordinary options");
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      !keys.includes(key) ||
      !descriptor?.enumerable ||
      !("value" in descriptor) ||
      descriptor.value === undefined
    )
      fail("TYPE", path, "Expected supported own data options; omit undefined fields");
  }
}
export function positive(value: unknown, fallback: number, path: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    fail("VALUE", path, "Expected a positive safe integer");
  return value;
}
