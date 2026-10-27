import { dataArray } from "./data.js";
import { fail } from "./error.js";
import { ownOperationCapability, type OperationCapability } from "./operation-capability.js";

declare const extensionBrand: unique symbol;
export interface OperationExtension {
  readonly [extensionBrand]: true;
}
export interface ExtensionSelection {
  readonly feature: object;
  readonly capability: object;
  readonly contribution: object;
}
let descriptors: WeakMap<object, ExtensionSelection> | undefined;
/** Trusted sibling-package SPI. Public options accept only these opaque descriptors. */
export function defineOperationExtension(
  feature: object,
  capability: OperationCapability<unknown>,
  contribution: object,
): OperationExtension {
  const identity = Object.freeze(Object.create(null)) as OperationExtension;
  ownOperationCapability(capability);
  descriptors ??= new WeakMap();
  descriptors.set(identity, Object.freeze({ feature, capability, contribution }));
  return identity;
}
export function ownOperationExtensions(value: unknown): readonly ExtensionSelection[] {
  const path = "/options/extensions";
  dataArray(value, path);
  const features = new Set<object>();
  const selected = value.map((entry, index) => {
    const descriptor = entry && typeof entry === "object" ? descriptors?.get(entry) : undefined;
    if (!descriptor) fail("MEASUREMENT_CONTEXT", `${path}/${index}`, "Expected owned operation extension");
    if (features.has(descriptor.feature)) fail("VALUE", `${path}/${index}`, "Duplicate operation extension");
    features.add(descriptor.feature);
    return descriptor;
  });
  return Object.freeze(selected);
}
