import type { Box, XObjectNode } from "@updf/core";
import { name, type PdfDictionary, type PdfWriter } from "@updf/core/pdf";
import {
  createOwnedResource,
  type OwnedResource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
  xObjectSlot,
  type XObjectSite,
} from "@updf/core/resources";
import { decode, type Image, type PngMetadata } from "./decode.js";
import { parse } from "./parser.js";
import { sourceBytes } from "./source.js";

export type { PngMetadata } from "./decode.js";
export type PngResource = OwnedResource & { readonly metadata: PngMetadata };
const images = new WeakMap<OwnedResource, Image>();

/** Own, validate and decode a bounded PNG. No host IO or caller-owned storage is retained. */
export function preparePng(source: Uint8Array): PngResource {
  const bytes = sourceBytes(source);
  const image = decode(parse(bytes));
  const resource = createOwnedResource(image.metadata, {
    byteLength: bytes.length + image.pixels.length + (image.alpha?.length ?? 0),
  });
  images.set(resource, image);
  return resource;
}

/** Explicit point placement, stretched without DPI, aspect fitting or implicit clipping. */
export function png(resourceId: string, box: Box): XObjectNode {
  return { type: "xObject", resource: resourceId, x: box.x, y: box.y, width: box.width, height: box.height };
}

function dictionary(metadata: PngMetadata, mask = false): PdfDictionary {
  return {
    Type: name("XObject"),
    Subtype: name("Image"),
    Width: metadata.width,
    Height: metadata.height,
    BitsPerComponent: 8,
    ColorSpace: name(mask || metadata.components === 1 ? "DeviceGray" : "DeviceRGB"),
    Filter: name("FlateDecode"),
  };
}

function reserve(writer: PdfWriter, image: Image) {
  const ref = writer.reserve();
  const mask = image.alpha ? writer.reserve() : undefined;
  return {
    ref,
    define(): void {
      if (mask && image.alpha) writer.defineStream(mask, [image.alpha], dictionary(image.metadata, true));
      writer.defineStream(ref, [image.pixels], { ...dictionary(image.metadata), ...(mask ? { SMask: mask } : {}) });
    },
  };
}

/** Provider reuse is safe: keys, references and soft masks are operation-local. */
export function pngProvider(): ResourceProvider {
  const slot = resourceSlot<null>();
  return Object.freeze({
    slot,
    collectXObject(site: XObjectSite, collection: ResourceCollection): void {
      const image = images.get(site.resource);
      if (!image) return;
      const resource = collection.intern(slot, site.resource, () => ({
        category: "XObject",
        payload: null,
        phase: "content",
        reserve: (writer) => reserve(writer, image),
      }));
      collection.bindPainting(site.identity, xObjectSlot, { resource, finish: () => null });
    },
  });
}
