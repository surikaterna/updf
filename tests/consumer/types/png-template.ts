import { preparePng, type PngResource, type PngSignal } from "@updf/png";

export function prepare(bytes: Uint8Array, signal?: PngSignal): Promise<PngResource> {
  return preparePng(bytes, signal ? { signal } : {});
}
