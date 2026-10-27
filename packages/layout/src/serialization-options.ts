import type { LowerOptions } from "@updf/core/vdom";

/** Core validates again; preserve descriptors/present values while omitting lowering-only keys. */
export function serializationOptions(options: LowerOptions) {
  const {
    registry: _registry,
    resourceMetadata: _metadata,
    ...descriptors
  } = Object.getOwnPropertyDescriptors(options);
  return Object.create(Object.getPrototypeOf(options), descriptors);
}
