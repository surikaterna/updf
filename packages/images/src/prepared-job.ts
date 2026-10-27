import { fail } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import type { PreparationSignal } from "@updf/layout/internal-preparation";
import type { captureOptions } from "./load-options.js";

export interface PreparedJobResult {
  readonly resource: OwnedResource;
  readonly sourceBytes: number;
}
const byteLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), "byteLength")!.get!;

/** Job diagnostics are relative; the preparation stage owns occurrence paths. */
export async function preparedJob(
  policy: ReturnType<typeof captureOptions>,
  uri: string,
  maxBytes: number,
  signal?: PreparationSignal,
): Promise<Readonly<PreparedJobResult>> {
  if (signal?.aborted) fail("MEASUREMENT_CONTEXT", "/images/load", "Image preparation cancelled");
  const bytes = await policy.loader.load(uri, { maxBytes, ...(signal === undefined ? {} : { signal }) });
  if (signal?.aborted) fail("MEASUREMENT_CONTEXT", "/images/load", "Image preparation cancelled");
  if (!(bytes instanceof Uint8Array) || byteLength.call(bytes) > maxBytes)
    fail("LIMIT", "/images/load", "Image transport exceeded remaining byte allowance");
  const sourceBytes = byteLength.call(bytes) as number;
  const formats = policy.formats.filter(({ matches }) => matches(bytes));
  if (formats.length !== 1) fail("RESOURCE", "/images/load", "No unique selected image byte signature");
  const resource = await formats[0]!.prepare(bytes, signal);
  return Object.freeze({ resource, sourceBytes });
}
