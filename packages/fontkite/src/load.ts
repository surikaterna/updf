import { AssetError, createAssetLoader, type AssetLoader, type AssetSignal } from "@updf/assets";
import { copyBytes } from "@updf/assets/bytes";
import { DocumentError } from "@updf/core";
import { ownDataValue, validateDataObject as record } from "@updf/core/internal";
import type { PreparedFont } from "@updf/fonts";
import { prepareFont } from "./index.js";

export interface LoadFontOptions {
  /** URI sources require an explicitly supplied loader with network capability. */
  readonly loader?: AssetLoader;
  readonly signal?: AssetSignal;
}
const maxBytes = 4 * 1024 * 1024;
const byteLoader = createAssetLoader({ maxBytes });

function checkAbort(signal?: AssetSignal): void {
  if (
    signal &&
    (typeof signal.aborted !== "boolean" ||
      typeof signal.addEventListener !== "function" ||
      typeof signal.removeEventListener !== "function")
  )
    throw new DocumentError("TYPE", "/options/signal", "Expected abort signal");
  if (signal?.aborted) throw new DocumentError("FONT_LOAD", "/font/source", "Font loading was aborted");
}

function fontError(error: unknown): never {
  if (error instanceof AssetError)
    throw new DocumentError(error.code === "LOAD" ? "FONT_LOAD" : error.code, `/font${error.path}`, error.message);
  throw error;
}

async function transportBytes(
  loader: AssetLoader,
  load: AssetLoader["load"],
  source: string | Uint8Array,
  signal?: AssetSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return await Reflect.apply(load, loader, [source, { maxBytes, ...(signal ? { signal } : {}) }]);
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    if (error instanceof AssetError) fontError(error);
    // Do not inspect or coerce arbitrary values thrown by a host capability.
    throw new DocumentError("FONT_LOAD", "/font/source", "Font loader failed");
  }
}

/** Optional URI/byte convenience; does not widen prepareFont's experimental profile. */
export async function loadFont(source: string | Uint8Array, options: LoadFontOptions = {}): Promise<PreparedFont> {
  record(options, ["loader", "signal"], "/options");
  const supplied = ownDataValue<LoadFontOptions, "loader">(options, "loader", "/options/loader");
  const signal = ownDataValue<LoadFontOptions, "signal">(options, "signal", "/options/signal");
  if (Object.hasOwn(options, "loader") && !supplied)
    throw new DocumentError("TYPE", "/options/loader", "Expected asset loader");
  if (Object.hasOwn(options, "signal") && !signal)
    throw new DocumentError("TYPE", "/options/signal", "Expected abort signal");
  const loader = supplied ?? byteLoader;
  record(loader, ["resolve", "load"], "/options/loader");
  const resolve = ownDataValue<AssetLoader, "resolve">(loader, "resolve", "/options/loader/resolve");
  if (typeof resolve !== "function")
    throw new DocumentError("TYPE", "/options/loader/resolve", "Expected asset URI resolver");
  const load = ownDataValue<AssetLoader, "load">(loader, "load", "/options/loader/load");
  if (typeof load !== "function")
    throw new DocumentError("TYPE", "/options/loader/load", "Expected asset loading capability");
  checkAbort(signal);
  const bytes = await transportBytes(loader, load, source, signal);
  checkAbort(signal);
  try {
    const font = prepareFont(copyBytes(bytes, maxBytes));
    checkAbort(signal);
    return font;
  } catch (error) {
    fontError(error);
  }
}
