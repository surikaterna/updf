import { fail } from "@updf/core/internal";
import type { PreparationContext } from "./preparation-resource.js";

declare const serviceBrand: unique symbol;
export interface PreparationService<T> {
  readonly [serviceBrand]: T;
}
const handles = new WeakSet<object>();
const contexts = new WeakMap<PreparationContext, Map<object, unknown>>();

/** Identity only: implementations stay with the selected preparation session. */
export function definePreparationService<T>(): PreparationService<T> {
  const handle = Object.freeze(Object.create(null)) as PreparationService<T>;
  handles.add(handle);
  return handle;
}

export function checkPreparationService(handle: unknown): asserts handle is PreparationService<unknown> {
  if (!handle || typeof handle !== "object" || !handles.has(handle))
    fail("TYPE", "/preparation/service", "Expected owned preparation service identity");
}

export function readPreparationService<T>(context: PreparationContext, handle: PreparationService<T>, path: string): T {
  checkPreparationService(handle);
  const services = contexts.get(context);
  if (!services) fail("MEASUREMENT_CONTEXT", path, "Expected active preparation context");
  context.check();
  if (!services.has(handle)) fail("PHASE", path, "Required preparation service is not selected");
  return services.get(handle) as T;
}

export function preparationServices(context: PreparationContext) {
  const services = new Map<object, unknown>();
  contexts.set(context, services);
  return {
    install(handle: PreparationService<unknown>, value: unknown) {
      context.check();
      checkPreparationService(handle);
      if (services.has(handle)) fail("VALUE", "/preparation/service", "Duplicate preparation service identity");
      services.set(handle, value);
    },
    close() {
      contexts.delete(context);
      services.clear();
    },
  };
}
