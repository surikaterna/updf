import { defineOperationExtension, fail } from "@updf/core/internal";
import type { OperationExtension } from "@updf/core/resources";
import { imageCapability, imagesFeature, visual } from "./visual.js";

export { Image } from "./visual.js";
export type { ImageProps, PreparedImage, UrlImageSource } from "./types.js";

/** Prepared handles only. Callers bind resources and select their actual codec providers. */
export function images(): OperationExtension {
  if (arguments.length) fail("TYPE", "/images", "Prepared-only images() accepts no arguments");
  return defineOperationExtension(imagesFeature, imageCapability, visual.adapters);
}
