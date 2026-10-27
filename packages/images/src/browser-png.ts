import { DocumentError } from "@updf/core";
import { preparePng } from "@updf/png";
import { preparePngNormalization } from "@updf/png/normalization";
import { browserPngBytes } from "./browser-png-conversion.js";
import { ownFormat, selectedFormat, type ImageFormatHandler } from "./format-handler.js";
import { pngImages } from "./png.js";

const byteLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "byteLength")!.get!;

/** Explicit browser-rendered 16-to-8-bit conversion; ordinary PNGs retain native preparation. */
export function browserPngImages(): ImageFormatHandler {
  if (arguments.length) throw new DocumentError("TYPE", "/images/browser-png", "Expected no arguments");
  const native = selectedFormat(pngImages());
  return ownFormat({
    ...native,
    async prepare(bytes, signal) {
      // Header routing is not eligibility: either selected validator still checks the whole source.
      if (!ArrayBuffer.isView(bytes) || byteLength.call(bytes) < 25 || bytes[24] !== 16)
        return native.prepare(bytes, signal);
      const options = signal === undefined ? {} : { signal };
      const source = await preparePngNormalization(bytes, options);
      const normalized = await browserPngBytes(source, signal);
      const resource = await preparePng(normalized, options);
      if (resource.metadata.width !== source.metadata.width || resource.metadata.height !== source.metadata.height)
        throw new DocumentError("PNG_DATA", "/source", "Browser PNG dimensions changed");
      return resource;
    },
  });
}
