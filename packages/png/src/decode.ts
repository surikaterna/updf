import { requireData } from "./errors.js";
import type { ParsedPng } from "./parser.js";
import { checkAbort, type PngSignal } from "./options.js";
import { transcode } from "./streams.js";
import { inflate, rowFilter, rowStride } from "./scanlines.js";

export interface PngMetadata {
  readonly kind: "png";
  readonly width: number;
  readonly height: number;
  readonly components: 1 | 3;
  readonly alpha: boolean;
}
export interface Image {
  metadata: PngMetadata;
  pixels: Uint8Array;
  alpha?: Uint8Array;
}

function paeth(left: number, up: number, corner: number): number {
  const estimate = left + up - corner;
  const a = Math.abs(estimate - left),
    b = Math.abs(estimate - up),
    c = Math.abs(estimate - corner);
  return a <= b && a <= c ? left : b <= c ? up : corner;
}

function unfilter(info: ParsedPng, bytes: Uint8Array): void {
  const stride = rowStride(info);
  for (let row = 0; row < info.height; row++) {
    const start = row * stride;
    const filter = rowFilter(bytes, start);
    for (let index = 1; index < stride; index++) {
      const left = index > info.channels ? bytes[start + index - info.channels]! : 0;
      const up = row > 0 ? bytes[start + index - stride]! : 0;
      const corner = row > 0 && index > info.channels ? bytes[start + index - stride - info.channels]! : 0;
      const prediction =
        filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : filter === 4
                ? paeth(left, up, corner)
                : 0;
      bytes[start + index] = (bytes[start + index]! + prediction) & 255;
    }
  }
}

function pixel(info: ParsedPng, bytes: Uint8Array, offset: number, colors: Uint8Array, target: number): number {
  if (info.color === 3) {
    const index = bytes[offset]!;
    requireData(info.palette && index * 3 + 2 < info.palette.length, "PNG palette index is out of range");
    colors.set(info.palette.subarray(index * 3, index * 3 + 3), target);
    return info.transparency?.[index] ?? 255;
  }
  const components = info.color === 0 || info.color === 4 ? 1 : 3;
  colors.set(bytes.subarray(offset, offset + components), target);
  if (info.color === 4 || info.color === 6) return bytes[offset + components]!;
  if (!info.transparency) return 255;
  for (let channel = 0; channel < components; channel++) {
    if (bytes[offset + channel] !== info.transparency[channel * 2 + 1]) return 255;
  }
  return 0;
}

export async function decode(info: ParsedPng, signal?: PngSignal): Promise<Image> {
  const bytes = await inflate(info, signal);
  checkAbort(signal);
  unfilter(info, bytes);
  const { width, height } = info;
  const components = info.color === 0 || info.color === 4 ? 1 : 3;
  const pixels = new Uint8Array(width * height * components);
  const alpha = info.color === 4 || info.color === 6 || info.transparency ? new Uint8Array(width * height) : undefined;
  const stride = rowStride(info);
  for (let index = 0; index < width * height; index++) {
    const offset = Math.floor(index / width) * stride + 1 + (index % width) * info.channels;
    const opacity = pixel(info, bytes, offset, pixels, index * components);
    if (alpha) alpha[index] = opacity;
  }
  return {
    metadata: { kind: "png", width, height, components, alpha: !!alpha },
    pixels: await transcode(pixels, pixels.length * 2 + 1024, "CompressionStream", signal),
    ...(alpha ? { alpha: await transcode(alpha, alpha.length * 2 + 1024, "CompressionStream", signal) } : {}),
  };
}
