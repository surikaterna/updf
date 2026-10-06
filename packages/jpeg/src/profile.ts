import { limit, profile, requireData } from "./errors.js";
import { word } from "./markers.js";

export interface JpegMetadata {
  readonly kind: "jpeg";
  readonly width: number;
  readonly height: number;
  readonly components: 1 | 3;
}
export interface Frame {
  readonly metadata: JpegMetadata;
  readonly quantization: readonly number[];
}
export function jfif(bytes: Uint8Array): void {
  if (bytes.length < 5 || ![74, 70, 73, 70, 0].every((value, i) => bytes[i] === value)) profile("APP0 must be JFIF");
  requireData(bytes.length >= 14, "Truncated JFIF header");
  if (bytes[5] !== 1 || (bytes[6] ?? 255) > 2 || (bytes[7] ?? 255) > 2)
    profile("Only JFIF 1.00–1.02 density units 0–2 are supported");
  requireData(word(bytes, 8) > 0 && word(bytes, 10) > 0, "JFIF density must be positive");
  requireData(bytes.length === 14 + 3 * (bytes[12] ?? 0) * (bytes[13] ?? 0), "Invalid JFIF thumbnail length");
}
export function frame(bytes: Uint8Array, hasJfif: boolean): Frame {
  requireData(bytes.length >= 6, "Truncated SOF0");
  if (bytes[0] !== 8) profile("Only 8-bit baseline JPEG is supported");
  const height = word(bytes, 1),
    width = word(bytes, 3);
  requireData(width > 0 && height > 0, "JPEG dimensions must be positive");
  if (width * height > 64_000_000) limit("JPEG exceeds 64 million pixels");
  const components = bytes[5];
  if (components !== 1 && components !== 3) profile("Only grayscale or JFIF YCbCr is supported");
  if (components === 3 && !hasJfif) profile("Three-component JPEG requires immediate JFIF APP0");
  requireData(bytes.length === 6 + 3 * components, "Invalid SOF0 length");
  const quantization: number[] = [];
  for (let i = 0; i < components; i++) {
    if (bytes[6 + 3 * i] !== i + 1) profile("Unsupported component ids or order");
    const sampling = bytes[7 + 3 * i];
    const valid =
      components === 3 && i === 0 ? sampling === 0x11 || sampling === 0x21 || sampling === 0x22 : sampling === 0x11;
    if (!valid) profile("Only grayscale 1x1 and YCbCr 444/422/420 sampling are supported");
    const table = bytes[8 + 3 * i] ?? 255;
    requireData(table <= 3, "Invalid frame quantization selector");
    quantization.push(table);
  }
  return { metadata: { kind: "jpeg", width, height, components }, quantization };
}
export function scan(bytes: Uint8Array, selected: Frame, quantization: Set<number>, huffman: Set<number>): void {
  const count = selected.metadata.components;
  if (bytes[0] !== count) profile("Single scan must include all frame components");
  requireData(bytes.length === 1 + 2 * count + 3, "Invalid SOS length");
  const end = 1 + 2 * count;
  if (bytes[end] !== 0 || bytes[end + 1] !== 63 || bytes[end + 2] !== 0)
    profile("Only baseline sequential scan parameters are supported");
  for (let i = 0; i < count; i++) {
    if (bytes[1 + 2 * i] !== i + 1) profile("Scan component order must match frame");
    const selector = bytes[2 + 2 * i] ?? 255;
    requireData(selector >> 4 <= 3 && (selector & 15) <= 3, "Invalid scan Huffman selector");
    requireData(huffman.has(selector >> 4) && huffman.has(0x10 | (selector & 15)), "Undefined scan Huffman table");
    requireData(quantization.has(selected.quantization[i] ?? -1), "Undefined frame quantization table");
  }
}
