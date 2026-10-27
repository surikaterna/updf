import { requireData } from "./errors.js";
import type { Header, ParsedPng } from "./parser.js";
import type { PngSignal } from "./options.js";
import { transcode } from "./streams.js";

export function rowStride(info: Header<1 | 2>): number {
  return info.width * info.channels * info.sampleBytes + 1;
}

export async function inflate(info: ParsedPng<1 | 2>, signal?: PngSignal): Promise<Uint8Array> {
  requireData(info.compressed.length >= 6, "Truncated PNG zlib stream");
  const expected = rowStride(info) * info.height;
  const result = await transcode(info.compressed, expected, "DecompressionStream", signal);
  requireData(result.length === expected, "PNG decoded scanline length mismatch");
  return result;
}

export function rowFilter(bytes: Uint8Array, start: number): number {
  const filter = bytes[start]!;
  requireData(filter <= 4, "Invalid PNG row filter");
  return filter;
}
