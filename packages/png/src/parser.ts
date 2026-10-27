import { crc32 } from "./checksums.js";
import { alphaLimit } from "./limits.js";
import { limit, profile, requireData } from "./errors.js";

export interface Header<SampleBytes extends 1 | 2 = 1> {
  width: number;
  height: number;
  color: number;
  channels: number;
  sampleBytes: SampleBytes;
}
export interface ParsedPng<SampleBytes extends 1 | 2 = 1> extends Header<SampleBytes> {
  compressed: Uint8Array;
  palette?: Uint8Array;
  transparency?: Uint8Array;
}
export interface ValidationProfile<SampleBytes extends 1 | 2> {
  sampleBytes: SampleBytes;
  header(bytes: Uint8Array, channels: number | undefined): void;
  transparency(bytes: Uint8Array): void;
  color?: ColorValidation;
}

export type ColorValidation = (type: string, bytes: Uint8Array, state: Readonly<ColorState>) => boolean;
interface ColorState {
  readonly srgb: boolean;
  readonly palette?: Uint8Array;
  readonly parts: readonly Uint8Array[];
}

const nativeProfile: ValidationProfile<1> = {
  sampleBytes: 1,
  header(bytes, channels) {
    if (bytes[8] !== 8 || !channels || bytes[10] !== 0 || bytes[11] !== 0 || bytes[12] !== 0)
      profile("Expected non-interlaced 8-bit grayscale, RGB, indexed, grayscale-alpha or RGBA PNG");
  },
  transparency(bytes) {
    for (let index = 0; index < bytes.length; index += 2) requireData(bytes[index] === 0, "tRNS exceeds 8-bit range");
  },
};
interface Chunk {
  type: string;
  bytes: Uint8Array;
  end: number;
}

function chunk(source: Uint8Array, offset: number): Chunk {
  requireData(offset + 12 <= source.length, "Truncated PNG chunk");
  const view = new DataView(source.buffer, source.byteOffset, source.length);
  const length = view.getUint32(offset);
  const end = offset + 12 + length;
  requireData(length <= 0x7fffffff && end <= source.length, "Invalid PNG chunk length");
  const type = String.fromCharCode(...source.subarray(offset + 4, offset + 8));
  requireData(/^[A-Za-z]{2}[A-Z][A-Za-z]$/u.test(type), "Invalid PNG chunk type");
  requireData(crc32(source.subarray(offset + 4, end - 4)) === view.getUint32(end - 4), "PNG CRC mismatch");
  return { type, bytes: source.subarray(offset + 8, end - 4), end };
}

function header(bytes: Uint8Array, validation: ValidationProfile<1 | 2>): Header<1 | 2> {
  requireData(bytes.length === 13, "Invalid IHDR length");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const width = view.getUint32(0),
    height = view.getUint32(4);
  requireData(width > 0 && height > 0 && width <= 0x7fffffff && height <= 0x7fffffff, "Invalid PNG dimensions");
  const color = bytes[9]!;
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[color];
  validation.header(bytes, channels);
  const sampleBytes = validation.sampleBytes;
  if ((width * channels! * sampleBytes + 1) * height > 64 * 1024 * 1024 || width * height > alphaLimit)
    limit("PNG exceeds 64 MiB decoded scanlines or 16,000,000 pixels");
  return { width, height, color, channels: channels!, sampleBytes };
}

function palette(bytes: Uint8Array, color: number): Uint8Array {
  requireData(color !== 0 && color !== 4, "Grayscale PNG cannot have PLTE");
  requireData(bytes.length > 0 && bytes.length <= 768 && bytes.length % 3 === 0, "Invalid PLTE length");
  return bytes;
}

function transparency(bytes: Uint8Array, state: State): Uint8Array {
  const { info, palette: colors } = state;
  if (info.color === 3) {
    requireData(colors && bytes.length > 0 && bytes.length <= colors.length / 3, "Invalid indexed tRNS");
  } else {
    requireData((info.color === 0 && bytes.length === 2) || (info.color === 2 && bytes.length === 6), "Invalid tRNS");
    state.validation.transparency(bytes);
  }
  return bytes;
}

function join(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

interface State {
  info: Header<1 | 2>;
  validation: ValidationProfile<1 | 2>;
  parts: Uint8Array[];
  palette?: Uint8Array;
  transparency?: Uint8Array;
  endedData: boolean;
  srgb: boolean;
}

function accept(state: State, entry: Chunk): void {
  const { type, bytes } = entry;
  if (type !== "IDAT" && state.parts.length) state.endedData = true;
  if (type === "IDAT") {
    requireData(!state.endedData, "IDAT chunks must be consecutive");
    requireData(state.info.color !== 3 || state.palette, "Indexed PNG requires PLTE before IDAT");
    state.parts.push(bytes);
  } else if (type === "PLTE") {
    requireData(!state.palette && !state.parts.length && !state.transparency, "Duplicate or misplaced PLTE");
    state.palette = palette(bytes, state.info.color);
  } else if (type === "tRNS") {
    requireData(!state.transparency && !state.parts.length, "Duplicate or misplaced tRNS");
    state.transparency = transparency(bytes, state);
  } else if (type === "IHDR") {
    requireData(false, "Duplicate IHDR");
  } else if (type === "sRGB") {
    requireData(
      !state.srgb && !state.parts.length && !state.palette && bytes.length === 1 && bytes[0]! <= 3,
      "Invalid sRGB",
    );
    state.srgb = true;
    state.validation.color?.(type, bytes, state);
  } else if (
    !["tEXt", "zTXt", "iTXt", "pHYs", "tIME"].includes(type) &&
    !state.validation.color?.(type, bytes, state)
  ) {
    profile(`Unsupported PNG chunk ${type}`);
  }
}

export function parse(source: Uint8Array): ParsedPng;
export function parse<S extends 1 | 2>(source: Uint8Array, validation: ValidationProfile<S>): ParsedPng<S>;
export function parse(source: Uint8Array, validation: ValidationProfile<1 | 2> = nativeProfile): ParsedPng<1 | 2> {
  requireData(
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => source[index] === byte),
    "Invalid PNG signature",
  );
  const first = chunk(source, 8);
  requireData(first.type === "IHDR", "IHDR must be first");
  const state: State = { info: header(first.bytes, validation), validation, parts: [], endedData: false, srgb: false };
  let offset = first.end;
  let count = 1;
  while (offset < source.length) {
    if (++count > 4096) limit("PNG exceeds 4096 chunks");
    const entry = chunk(source, offset);
    offset = entry.end;
    if (entry.type === "IEND") {
      requireData(entry.bytes.length === 0 && offset === source.length && state.parts.length > 0, "Invalid IEND");
      return {
        ...state.info,
        compressed: join(state.parts),
        ...(state.palette ? { palette: state.palette } : {}),
        ...(state.transparency ? { transparency: state.transparency } : {}),
      };
    }
    accept(state, entry);
  }
  requireData(false, "Missing IEND");
}
