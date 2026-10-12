import { DocumentError } from "@updf/core";

/** Structural AbortSignal contract; declarations require no DOM or Node ambient types. */
export interface PngSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
export interface PreparePngOptions {
  readonly signal?: PngSignal;
}

export function preparationSignal(options: PreparePngOptions): PngSignal | undefined {
  if (!options || typeof options !== "object" || ![null, Object.prototype].includes(Object.getPrototypeOf(options)))
    throw new DocumentError("TYPE", "/options", "Expected ordinary PNG preparation options");
  for (const key of Reflect.ownKeys(options)) {
    const field = Object.getOwnPropertyDescriptor(options, key)!;
    if (key !== "signal" || !field.enumerable || !("value" in field) || field.value === undefined)
      throw new DocumentError("TYPE", "/options", "Expected only an own signal data option; omit undefined");
  }
  const signal = Object.getOwnPropertyDescriptor(options, "signal")?.value as PngSignal | undefined;
  if (
    signal !== undefined &&
    (!signal ||
      typeof signal.aborted !== "boolean" ||
      typeof signal.addEventListener !== "function" ||
      typeof signal.removeEventListener !== "function")
  )
    throw new DocumentError("TYPE", "/options/signal", "Expected abort signal");
  checkAbort(signal);
  return signal;
}

export function checkAbort(signal?: PngSignal): void {
  if (signal?.aborted) throw new DocumentError("PNG_ABORT", "/source", "PNG preparation was aborted");
}
