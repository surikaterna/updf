import { createAssetLoader, type AssetFetch } from "@updf/assets";
import { copyBytes } from "@updf/assets/bytes";
import { loadFont } from "@updf/fontkit/load";
import type { PreparedFont } from "@updf/fonts";

export function prepare(bytes: Uint8Array, fetch?: AssetFetch): Promise<PreparedFont> {
  const loader = createAssetLoader({ maxBytes: 4 * 1024 * 1024, ...(fetch ? { fetch } : {}) });
  return loadFont(copyBytes(bytes, 4 * 1024 * 1024), { loader });
}
export async function remote(uri: string, fetch: AssetFetch): Promise<PreparedFont> {
  return loadFont(uri, { loader: createAssetLoader({ fetch }) });
}
