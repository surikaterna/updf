import { DocumentError } from "@updf/core";
import { alphaLimit } from "./limits.js";
import { preparationSignal, type PngSignal } from "./options.js";

export interface ReadPngAlphaOptions {
  readonly signal?: PngSignal;
  readonly maxPixels?: number;
}

export function alphaOptions(input: unknown): { signal: PngSignal | undefined; maxPixels: number } {
  if (!input || typeof input !== "object" || ![null, Object.prototype].includes(Object.getPrototypeOf(input)))
    throw new DocumentError("TYPE", "/options", "Expected ordinary alpha inspection options");
  const values: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(input)) {
    const field = Object.getOwnPropertyDescriptor(input, key)!;
    if (
      typeof key !== "string" ||
      !["signal", "maxPixels"].includes(key) ||
      !field.enumerable ||
      !("value" in field) ||
      field.value === undefined
    )
      throw new DocumentError("TYPE", "/options", "Expected own alpha data options; omit undefined");
    values[key] = field.value;
  }
  const maxPixels = Object.hasOwn(values, "maxPixels") ? values.maxPixels : alphaLimit;
  if (typeof maxPixels !== "number" || !Number.isSafeInteger(maxPixels) || maxPixels <= 0 || maxPixels > alphaLimit)
    throw new DocumentError("VALUE", "/options/maxPixels", "Expected positive safe integer at most 16,000,000");
  const signal = preparationSignal(Object.hasOwn(values, "signal") ? { signal: values.signal as PngSignal } : {});
  return { signal, maxPixels };
}
