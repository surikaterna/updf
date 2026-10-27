import { fail } from "@updf/core/internal";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { MeasureContext } from "./extension-types.js";

let contexts: WeakMap<object, { height: number; lifetime: ExtensionLifetime }> | undefined;

export function bindContentHeight(context: object, height: number, lifetime: ExtensionLifetime): void {
  contexts ??= new WeakMap();
  contexts.set(context, { height, lifetime });
}

/** Private metric Block content height, never the native axis's greatest fitting capacity. */
export function visualContentHeight(context: MeasureContext): number {
  const owned = contexts?.get(context);
  if (!owned || !owned.lifetime.active)
    fail("MEASUREMENT_CONTEXT", context.sourcePath, "Expected active definite Block content height");
  return owned.height;
}
