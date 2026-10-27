import { profile } from "./errors.js";
import { normalizationColor } from "./normalization-color.js";
import { checkAbort, preparationSignal, type PngSignal } from "./options.js";
import { parse, type ValidationProfile } from "./parser.js";
import { inflate, rowFilter, rowStride } from "./scanlines.js";
import { sourceBytes } from "./source.js";

export type { PngSignal };
export { PNG_SOURCE_LIMIT } from "./source.js";
export interface PreparePngNormalizationOptions {
  readonly signal?: PngSignal;
}
export interface PngNormalizationMetadata {
  readonly kind: "png";
  readonly width: number;
  readonly height: number;
  readonly bitDepth: 16;
  readonly colorType: 0 | 2 | 4 | 6;
  readonly alpha: boolean;
}
export interface PngNormalizationSource {
  /** Caller-owned snapshot, not immutable storage or a native painting certificate. */
  readonly bytes: Uint8Array;
  readonly metadata: PngNormalizationMetadata;
}

const normalizationProfile: ValidationProfile<2> = {
  sampleBytes: 2,
  header(bytes, channels) {
    if (bytes[8] !== 16 || !channels || bytes[9] === 3 || bytes[10] !== 0 || bytes[11] !== 0 || bytes[12] !== 0)
      profile("Expected non-interlaced 16-bit grayscale, RGB, grayscale-alpha or RGBA PNG");
  },
  // Every two-byte tRNS sample is in the exact 16-bit domain; shared parsing checks shape and placement.
  transparency() {},
};

/** Validate staging bytes only. No pixels are converted, encoded or published as a PNG resource. */
export async function preparePngNormalization(
  source: Uint8Array,
  options: PreparePngNormalizationOptions = {},
): Promise<PngNormalizationSource> {
  const signal = preparationSignal(options);
  const bytes = sourceBytes(source);
  const info = parse(bytes, { ...normalizationProfile, color: normalizationColor() });
  const scanlines = await inflate(info, signal);
  checkAbort(signal);
  const stride = rowStride(info);
  for (let start = 0; start < scanlines.length; start += stride) rowFilter(scanlines, start);
  const metadata: PngNormalizationMetadata = Object.freeze({
    kind: "png",
    width: info.width,
    height: info.height,
    bitDepth: 16,
    colorType: info.color as 0 | 2 | 4 | 6,
    alpha: info.color === 4 || info.color === 6 || !!info.transparency,
  });
  return Object.freeze({ bytes, metadata });
}
