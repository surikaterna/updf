import { DocumentError } from "@updf/core";
import { ownDataValue, validateDataObject } from "@updf/core/internal";

export function fail(code: "TYPE" | "VALUE" | "LIMIT" | "GEOMETRY", field: string, message: string): never {
  throw new DocumentError(code, `/barcode/${field}`, message);
}

export function record(value: unknown, keys: readonly string[]): void {
  validateDataObject(value, keys, "/barcode");
}

export function option(source: object, key: string, fallback: unknown): unknown {
  return Object.hasOwn(source, key) ? ownDataValue(source, key as never, `/barcode/${key}`) : fallback;
}

export function metric(value: unknown, key: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail("TYPE", key, "Expected finite point value");
  if (value < minimum || value > maximum) fail("VALUE", key, `Expected ${minimum}..${maximum} points`);
  return value;
}

export function payload(value: unknown, maximum: number, forbidden: RegExp): string {
  if (typeof value !== "string") fail("TYPE", "value", "Expected a string");
  if (value.length > maximum) fail("LIMIT", "value", `Maximum ${maximum} characters`);
  if (!value.length || forbidden.test(value)) fail("VALUE", "value", "Unsupported or empty barcode payload");
  return value;
}
