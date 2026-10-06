import type { Box, XObjectNode } from "@updf/core";
import { name, type PdfDictionary } from "@updf/core/pdf";
import {
  createOwnedResource,
  type OwnedResource,
  type ResourceCollection,
  type ResourceProvider,
  resourceSlot,
  xObjectSlot,
  type XObjectSite,
} from "@updf/core/resources";
import { sourceBytes } from "./source.js";
import { parse } from "./parser.js";
import type { JpegMetadata } from "./profile.js";

export type { JpegMetadata } from "./profile.js";
/** Opaque owned identity: compressed storage remains private; metadata is deeply frozen. */
export type JpegResource = OwnedResource & { readonly metadata: JpegMetadata };
const images = new WeakMap<OwnedResource, Uint8Array>();

/** Own and structurally validate a bounded baseline JPEG; does not decode entropy or pixels. */
export function prepareJpeg(source: Uint8Array): JpegResource {
  const bytes = sourceBytes(source);
  const metadata = parse(bytes);
  const resource = createOwnedResource(metadata, { byteLength: bytes.byteLength });
  images.set(resource, bytes);
  return resource;
}

/** Explicit point placement, stretched without DPI/orientation/aspect fitting or implicit clipping. */
export function jpeg(resourceId: string, box: Box): XObjectNode {
  return { type: "xObject", resource: resourceId, x: box.x, y: box.y, width: box.width, height: box.height };
}

/** Reusable portable provider; all resource keys and PDF references belong to the current operation. */
export function jpegProvider(): ResourceProvider {
  const slot = resourceSlot<null>();
  return Object.freeze({
    slot,
    collectXObject(site: XObjectSite, collection: ResourceCollection): void {
      const bytes = images.get(site.resource);
      if (!bytes) return;
      const resource = collection.intern(slot, site.resource, () => ({
        category: "XObject",
        payload: null,
        phase: "content",
        reserve(writer) {
          const ref = writer.reserve();
          return { ref, define: () => writer.defineStream(ref, [bytes], dictionary(site.resource as JpegResource)) };
        },
      }));
      collection.bindPainting(site.identity, xObjectSlot, { resource, finish: () => null });
    },
  });
}

function dictionary(resource: JpegResource): PdfDictionary {
  const { width, height, components } = resource.metadata;
  return {
    Type: name("XObject"),
    Subtype: name("Image"),
    Width: width,
    Height: height,
    BitsPerComponent: 8,
    ColorSpace: name(components === 1 ? "DeviceGray" : "DeviceRGB"),
    Filter: name("DCTDecode"),
    ...(components === 3 ? { DecodeParms: { ColorTransform: 1 } } : {}),
  };
}
