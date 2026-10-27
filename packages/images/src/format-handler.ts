import { fail } from "@updf/core/internal";
import type { OwnedResource, ResourceProvider } from "@updf/core/resources";
import type { PreparationSignal } from "@updf/layout/internal-preparation";

declare const formatBrand: unique symbol;
export interface ImageFormatHandler {
  readonly [formatBrand]: true;
}
export interface Format {
  readonly kind: "png" | "jpeg";
  readonly matches: (bytes: Uint8Array) => boolean;
  readonly prepare: (bytes: Uint8Array, signal?: PreparationSignal) => Promise<OwnedResource>;
  readonly provider: ResourceProvider;
}
const handlers = new WeakMap<object, Format>();

/** Private codec-leaf ownership, never a public callback/plugin protocol. */
export function ownFormat(format: Format): ImageFormatHandler {
  const handler = Object.freeze(Object.create(null)) as ImageFormatHandler;
  handlers.set(handler, Object.freeze(format));
  return handler;
}

export function selectedFormat(value: unknown): Format {
  const format = value && typeof value === "object" ? handlers.get(value) : undefined;
  if (!format) fail("TYPE", "/images/formatHandlers", "Expected owned image format handler");
  return format;
}
