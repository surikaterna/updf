import { DocumentError } from "@updf/core";
import { alphaLimit, type PngSignal } from "@updf/png/alpha";

export interface PreparePngShapeOptions {
  readonly signal?: PngSignal;
  readonly shapeImageThreshold?: number;
  readonly maxPixels?: number;
  readonly maxCommands?: number;
}
export interface ShapeOptions {
  readonly signal?: PngSignal;
  readonly shapeImageThreshold: number;
  readonly maxPixels: number;
  readonly maxCommands: number;
}

function positiveLimit(value: unknown, ceiling: number, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > ceiling)
    throw new DocumentError("VALUE", path, `Expected positive safe integer at most ${ceiling}`);
  return value;
}

export function shapeOptions(input: unknown): ShapeOptions {
  if (!input || typeof input !== "object" || ![null, Object.prototype].includes(Object.getPrototypeOf(input)))
    throw new DocumentError("TYPE", "/options", "Expected ordinary PNG shape options");
  const values: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    const field = Object.getOwnPropertyDescriptor(input, key)!;
    if (
      typeof key !== "string" ||
      !["signal", "shapeImageThreshold", "maxPixels", "maxCommands"].includes(key) ||
      !field.enumerable ||
      !("value" in field) ||
      field.value === undefined
    )
      throw new DocumentError("TYPE", "/options", "Expected own PNG shape data options; omit undefined");
    values[key] = field.value;
  }
  const threshold = Object.hasOwn(values, "shapeImageThreshold") ? values.shapeImageThreshold : 0;
  if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new DocumentError("VALUE", "/options/shapeImageThreshold", "Expected finite threshold in [0,1]");
  return {
    ...(Object.hasOwn(values, "signal") ? { signal: values.signal as PngSignal } : {}),
    shapeImageThreshold: threshold,
    maxPixels: positiveLimit(
      Object.hasOwn(values, "maxPixels") ? values.maxPixels : alphaLimit,
      alphaLimit,
      "/options/maxPixels",
    ),
    maxCommands: positiveLimit(
      Object.hasOwn(values, "maxCommands") ? values.maxCommands : 4096,
      4096,
      "/options/maxCommands",
    ),
  };
}

export function checkShapeAbort(signal?: PngSignal): void {
  if (signal?.aborted) throw new DocumentError("PNG_ABORT", "/source", "PNG shape preparation was aborted");
}
