import type { AssetLoader } from "@updf/assets";
import { prepareFont } from "@updf/fontkite";
import { loadFont, type LoadFontOptions } from "@updf/fontkite/load";
import type { PreparedFont } from "@updf/fonts";

export function prepare(bytes: Uint8Array<ArrayBuffer>): PreparedFont {
  return prepareFont(bytes);
}
export function load(source: string | Uint8Array, loader?: AssetLoader): Promise<PreparedFont> {
  const options: LoadFontOptions = loader ? { loader } : {};
  return loadFont(source, options);
}
