import { copyBytes } from "./bytes.js";
import { fail } from "./errors.js";
import { abortable, checkAbort } from "./host.js";
import type { AssetResponse, AssetSignal } from "./types.js";

function checkResponse(response: AssetResponse, maximum: number): void {
  if (!response.ok) fail("LOAD", "/source", `Asset request failed (HTTP ${response.status})`);
  const length = response.headers.get("content-length");
  if (length && /^\d+$/u.test(length) && Number(length) > maximum)
    fail("LIMIT", "/source", "Asset response exceeds byte limit");
}
export async function responseBytes(
  response: AssetResponse,
  maximum: number,
  signal: AssetSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!response.body) {
    checkResponse(response, maximum);
    fail("LOAD", "/source", "Empty asset response");
  }
  const reader = response.body.getReader();
  let completed = false;
  try {
    checkResponse(response, maximum);
    let buffer = new Uint8Array(Math.min(maximum, 4096)),
      size = 0;
    for (let reads = 0; ; reads++) {
      checkAbort(signal);
      if (reads >= 65536) fail("LIMIT", "/source", "Asset response exceeds read limit");
      const item = await abortable(reader.read(), signal);
      if (item.done) {
        completed = true;
        break;
      }
      const bytes = copyBytes(item.value as Uint8Array, maximum - size);
      if (size + bytes.length > buffer.length) {
        const grown = new Uint8Array(Math.min(maximum, Math.max(size + bytes.length, buffer.length * 2)));
        grown.set(buffer.subarray(0, size));
        buffer = grown;
      }
      buffer.set(bytes, size);
      size += bytes.length;
    }
    return buffer.subarray(0, size);
  } finally {
    if (!completed) {
      try {
        void reader.cancel().catch(() => {});
      } catch {
        /* Cleanup must not hide the original failure. */
      }
    }
    reader.releaseLock();
  }
}
