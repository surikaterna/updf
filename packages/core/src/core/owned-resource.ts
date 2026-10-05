import { dataRecord, ownDataValue, snapshot } from "./data.js";
import { fail } from "./error.js";

declare const ownedResourceBrand: unique symbol;
export interface OwnedResource<T = unknown> {
  readonly [ownedResourceBrand]: true;
  readonly metadata: T;
}

const owned = new WeakMap<object, number>();

/** Own a frozen data snapshot; executable services and mutable storage stay private to their provider. */
export function createOwnedResource<T>(data: T, options: { readonly byteLength?: number } = {}): OwnedResource<T> {
  dataRecord(options, "/resource/options");
  const supplied = ownDataValue(options, "byteLength", "/resource/options/byteLength");
  const bytes = supplied === undefined ? 0 : supplied;
  if (typeof bytes !== "number" || !Number.isSafeInteger(bytes) || bytes < 0)
    fail("VALUE", "/resource/options/byteLength", "Expected nonnegative safe integer");
  const handle = Object.freeze({ metadata: snapshot(data, "/resource") });
  owned.set(handle, bytes);
  return handle as OwnedResource<T>;
}

/** Storage accounting belongs to the owned identity, never mutable public metadata or a runtime. */
export function ownedResourceBytes(resource: OwnedResource): number {
  if (!isOwnedResource(resource)) fail("FONT_RESOURCE", "/resource", "Expected owned resource");
  return owned.get(resource) ?? 0;
}

export function isOwnedResource(value: unknown): value is OwnedResource {
  return typeof value === "object" && value !== null && owned.has(value);
}
