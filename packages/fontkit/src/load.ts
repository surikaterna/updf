import { AssetError, createAssetLoader, type AssetLoader, type AssetSignal } from "@updf/assets";
import { copyBytes } from "@updf/assets/bytes";
import { DocumentError } from "@updf/core";
import { ownDataValue, validateDataObject as record } from "@updf/core/internal";
import type { PreparedFont } from "@updf/fonts";
import { prepareFont } from "./index.js";

export interface LoadFontOptions {
  /** Required for URI sources; byte sources need no network capability. */
  readonly loader?: AssetLoader;
  readonly signal?: AssetSignal;
}
const maxBytes = 4 * 1024 * 1024;
const byteLoader = createAssetLoader({ maxBytes });

function fontError(error: unknown): never {
  if (error instanceof AssetError)
    throw new DocumentError(error.code === "LOAD" ? "FONT_LOAD" : error.code, `/font${error.path}`, error.message);
  if (error instanceof DocumentError && error.diagnostics[0]?.code === "FONT_FORMAT") {
    const diagnostic = error.diagnostics[0];
    throw new DocumentError(
      "FONT_FORMAT",
      diagnostic.path,
      `${diagnostic.message}. Use a direct static TrueType font file, not a Google Fonts CSS stylesheet; WOFF/WOFF2 and variable fonts are unsupported.`,
      diagnostic,
    );
  }
  throw error;
}
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

/** Optional asynchronous URI/byte convenience; retains prepareFont's static TrueType/rights profile. */
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
  const load = ownDataValue<AssetLoader, "load">(loader, "load", "/options/loader/load");
  if (typeof load !== "function")
    throw new DocumentError("TYPE", "/options/loader/load", "Expected asset loading capability");
  try {
    checkAbort(signal);
    const bytes = await load.call(loader, source, { maxBytes, ...(signal ? { signal } : {}) });
    checkAbort(signal);
    const font = prepareFont(copyBytes(bytes, maxBytes));
    checkAbort(signal);
    return font;
  } catch (error) {
    fontError(error);
  }
}
