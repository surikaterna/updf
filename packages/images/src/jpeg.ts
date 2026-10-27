import { jpegProvider, prepareJpeg } from "@updf/jpeg";
import { ownFormat, type ImageFormatHandler } from "./format-handler.js";

export function jpegImages(): ImageFormatHandler {
  return ownFormat({
    kind: "jpeg",
    provider: jpegProvider(),
    matches: (bytes) => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    prepare: async (bytes) => prepareJpeg(bytes),
  });
}
