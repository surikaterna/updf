import { preparePng, type PngMetadata, type PngResource } from "@updf/png";
import {
  preparePngNormalization,
  type PngNormalizationSource,
  type PngNormalizationMetadata,
  type PreparePngNormalizationOptions,
  type PngSignal,
} from "@updf/png/normalization";

export async function eligibility(source: Uint8Array, signal: PngSignal): Promise<PngNormalizationSource> {
  const options: PreparePngNormalizationOptions = { signal };
  const result = await preparePngNormalization(source, options);
  const metadata: PngNormalizationMetadata = result.metadata;
  const depth: 16 = metadata.bitDepth;
  result.bytes[0] = depth;
  // @ts-expect-error A validation result is not a native resource.
  const resource: PngResource = result;
  // @ts-expect-error Source metadata is not decoded native resource metadata.
  const nativeMetadata: PngMetadata = metadata;
  // @ts-expect-error The snapshot property is readonly, though its elements are mutable.
  result.bytes = source;
  // @ts-expect-error Native preparation must not offer an allow-16 escape hatch.
  await preparePng(source, { allow16: true });
  // @ts-expect-error Eligibility does not offer a validation bypass.
  await preparePngNormalization(source, { skipValidation: true });
  // @ts-expect-error Exact optional data options omit undefined.
  await preparePngNormalization(source, { signal: undefined });
  void resource;
  void nativeMetadata;
  return result;
}
