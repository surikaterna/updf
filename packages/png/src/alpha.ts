import { DocumentError } from "@updf/core";
import type { PngResource } from "./index.js";
import { alphaOptions, type ReadPngAlphaOptions } from "./alpha-options.js";
import { images } from "./image-owner.js";
import { checkAbort } from "./options.js";
import { transcode } from "./streams.js";

export { alphaLimit } from "./limits.js";
export type { PngResource } from "./index.js";
export type { ReadPngAlphaOptions } from "./alpha-options.js";
export type { PngSignal } from "./options.js";
export type PngAlpha = Readonly<{ width: number; height: number }> &
  (Readonly<{ kind: "opaque" }> | Readonly<{ kind: "alpha"; bytes: Uint8Array }>);
/** Authenticate the original PNG handle before exposing bounded, immutable inspection metadata. */
export function pngAlphaInfo(resource: PngResource): Readonly<{ width: number; height: number; hasAlpha: boolean }> {
  const image = images.get(resource);
  if (!image) throw new DocumentError("RESOURCE", "/resource", "Expected an owned prepared PNG resource");
  return Object.freeze({ width: image.metadata.width, height: image.metadata.height, hasAlpha: !!image.alpha });
}

/** Additional bounded soft-mask inflation, never a source PNG/RGB decode. Bytes are caller-owned and mutable. */
export async function readPngAlpha(resource: PngResource, options?: ReadPngAlphaOptions): Promise<PngAlpha> {
  // Authenticate before reading any caller-visible resource property (including metadata).
  const image = images.get(resource);
  if (!image) throw new DocumentError("RESOURCE", "/resource", "Expected an owned prepared PNG resource");
  const { signal, maxPixels } = alphaOptions(arguments.length < 2 ? {} : options);
  const { width, height } = image.metadata;
  if (width * height > maxPixels) throw new DocumentError("LIMIT", "/resource", "PNG exceeds inspection pixel budget");
  if (!image.alpha) return Object.freeze({ kind: "opaque", width, height });
  const bytes = await transcode(image.alpha, width * height, "DecompressionStream", signal);
  checkAbort(signal);
  if (bytes.length !== width * height)
    throw new DocumentError("PNG_DATA", "/resource", "Invalid PNG alpha plane length");
  return Object.freeze({ kind: "alpha", width, height, bytes });
}
