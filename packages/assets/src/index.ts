import { copyBytes } from "./bytes.js";
import { AssetError, fail, positive, record } from "./errors.js";
import { abortable, checkAbort, loadingScope, resolveUri } from "./host.js";
import { responseBytes } from "./response.js";
import type { AssetLoadOptions, AssetLoader, AssetLoaderOptions } from "./types.js";

export { AssetError } from "./errors.js";
export type { AssetErrorCode } from "./errors.js";
export type {
  AssetFetch,
  AssetFetchInit,
  AssetLoadOptions,
  AssetLoader,
  AssetLoaderOptions,
  AssetReader,
  AssetResponse,
  AssetSignal,
} from "./types.js";

function configure(options: AssetLoaderOptions) {
  record(options, ["fetch", "baseURI", "allowUri", "maxBytes", "timeoutMs"], "/options");
  const config = Object.assign(Object.create(null), options) as AssetLoaderOptions;
  if (config.fetch !== undefined && typeof config.fetch !== "function")
    fail("TYPE", "/options/fetch", "Expected fetch capability");
  if (config.allowUri !== undefined && typeof config.allowUri !== "function")
    fail("TYPE", "/options/allowUri", "Expected URI policy");
  if (config.baseURI !== undefined && typeof config.baseURI !== "string")
    fail("TYPE", "/options/baseURI", "Expected base URI");
  const timeoutMs = positive(config.timeoutMs, 10000, "/options/timeoutMs");
  if (timeoutMs > 2147483647) fail("VALUE", "/options/timeoutMs", "Timeout exceeds platform timer range");
  return Object.freeze(
    Object.assign(Object.create(null), config, {
      timeoutMs,
      maxBytes: positive(config.maxBytes, 8 * 1024 * 1024, "/options/maxBytes"),
    }),
  ) as AssetLoaderOptions & { maxBytes: number; timeoutMs: number };
}
function requestOptions(options: AssetLoadOptions, maximum: number) {
  record(options, ["signal", "maxBytes"], "/options");
  const own = Object.assign(Object.create(null), options) as AssetLoadOptions;
  if (
    own.signal &&
    (typeof own.signal.aborted !== "boolean" ||
      typeof own.signal.addEventListener !== "function" ||
      typeof own.signal.removeEventListener !== "function")
  )
    fail("TYPE", "/options/signal", "Expected abort signal");
  if (Object.hasOwn(own, "signal") && !own.signal) fail("TYPE", "/options/signal", "Expected abort signal");
  return { signal: own.signal, maxBytes: Math.min(maximum, positive(own.maxBytes, maximum, "/options/maxBytes")) };
}

/** Create an immutable codec-free transport. Fetching is explicitly enabled; calls have no shared cache. */
export function createAssetLoader(options: AssetLoaderOptions = {}): AssetLoader {
  const config = configure(options);
  return Object.freeze({
    resolve: (uri: string) => resolveUri(uri, config),
    async load(source: string | Uint8Array, options: AssetLoadOptions = {}) {
      const { signal, maxBytes } = requestOptions(options, config.maxBytes);
      checkAbort(signal);
      if (typeof source !== "string") return copyBytes(source, maxBytes);
      const uri = resolveUri(source, config),
        fetch = config.fetch;
      if (!fetch) fail("LOAD", "/options/fetch", "URI loading requires an explicitly configured fetch capability");
      const scope = loadingScope(signal, config.timeoutMs);
      try {
        const response = await abortable(
          fetch(uri, { signal: scope.signal, credentials: "omit", redirect: "error" }),
          scope.signal,
        );
        const bytes = await responseBytes(response, maxBytes, scope.signal);
        checkAbort(scope.signal);
        return bytes;
      } catch (error) {
        if (error instanceof AssetError) throw error;
        fail("LOAD", "/source", "Asset request or response failed");
      } finally {
        scope.close();
      }
    },
  });
}
