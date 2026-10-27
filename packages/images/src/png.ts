import { pngProvider, preparePng } from "@updf/png";
import { ownFormat, type ImageFormatHandler } from "./format-handler.js";

export function pngImages(): ImageFormatHandler {
  return ownFormat({
    kind: "png",
    provider: pngProvider(),
    matches: (bytes) => [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte),
    prepare: (bytes, signal) => preparePng(bytes, signal === undefined ? {} : { signal }),
  });
}
