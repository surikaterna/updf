import { array, fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import type { AssetLoader } from "@updf/assets";
import { selectedFormat, type ImageFormatHandler } from "./format-handler.js";
import type { ImageCache } from "./cache.js";
import { cachePort, type ImagePolicy } from "./cache-owner.js";

export interface ImagesOptions {
  readonly loader: AssetLoader;
  readonly formatHandlers: readonly ImageFormatHandler[];
  readonly cache?: ImageCache;
}

export function captureOptions(options: ImagesOptions) {
  validateDataObject(options, ["loader", "formatHandlers", "cache"], "/images");
  const loader = ownDataValue(options, "loader", "/images/loader");
  validateDataObject(loader, ["resolve", "load"], "/images/loader");
  const resolve = ownDataValue(loader, "resolve", "/images/loader/resolve");
  const load = ownDataValue(loader, "load", "/images/loader/load");
  if (typeof resolve !== "function" || typeof load !== "function")
    fail("TYPE", "/images/loader", "Expected explicit asset loader capabilities");
  const input = ownDataValue(options, "formatHandlers", "/images/formatHandlers");
  array(input, Number.MAX_SAFE_INTEGER, "/images/formatHandlers");
  const formats = input.map(selectedFormat);
  if (!formats.length || new Set(formats.map(({ kind }) => kind)).size !== formats.length)
    fail("VALUE", "/images/formatHandlers", "Select nonempty, distinct owned image formats");
  return Object.freeze({
    loader: Object.freeze({ resolve: resolve.bind(loader), load: load.bind(loader) }) as AssetLoader,
    formats: Object.freeze(formats),
    policy: Object.freeze({ receiver: loader, resolve, load, handlers: Object.freeze([...input]) }) as ImagePolicy,
    cache: Object.hasOwn(options, "cache") ? cachePort(ownDataValue(options, "cache", "/images/cache")) : undefined,
  });
}
