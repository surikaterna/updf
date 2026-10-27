import { ownDataValue, validateDataObject, fail } from "@updf/core/internal";
import { CacheBackend } from "./cache-backend.js";
import { ownCache } from "./cache-owner.js";

export interface ImageCacheOptions {
  readonly maxEntries: number;
  readonly maxBytes: number;
  readonly maxConsumers: number;
}
export interface ImageCacheSnapshot {
  readonly entries: number;
  readonly pending: number;
  readonly consumers: number;
  readonly accountedBytes: number;
  readonly disposed: boolean;
}
declare const cacheBrand: unique symbol;
export interface ImageCache {
  readonly [cacheBrand]: true;
  readonly clear: () => void;
  readonly dispose: () => void;
  readonly snapshot: () => Readonly<ImageCacheSnapshot>;
}

/** Explicit bounded retention; source URL contents must remain stable until eviction or clear. */
export function createImageCache(options: ImageCacheOptions): ImageCache {
  if (arguments.length !== 1) fail("TYPE", "/images/cache", "Expected explicit cache bounds");
  validateDataObject(options, ["maxEntries", "maxBytes", "maxConsumers"], "/images/cache");
  const values = ["maxEntries", "maxBytes", "maxConsumers"].map((name) => {
    const value = ownDataValue(options, name, `/images/cache/${name}`);
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
      fail("VALUE", `/images/cache/${name}`, "Expected positive safe integer");
    return value;
  });
  const backend = new CacheBackend(values[0]!, values[1]!, values[2]!);
  const handle = Object.freeze({
    clear: backend.clear,
    dispose: backend.dispose,
    snapshot: backend.snapshot,
  }) as ImageCache;
  ownCache(handle, backend);
  return handle;
}
