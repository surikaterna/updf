import { createAssetLoader } from "@updf/assets";
import type { PreparedFont } from "@updf/fonts";
import { type FontEngine, fontEngine } from "./font-uri-controls.js";

const loader = createAssetLoader({ fetch: globalThis.fetch, maxBytes: 4 * 1024 * 1024, timeoutMs: 10000 });
export interface LoadedFont {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly font: PreparedFont;
  readonly preparationMs: number;
}
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Font loading was cancelled");
}

export async function loadSelectedFont(
  uri: string,
  engine: FontEngine,
  signal?: AbortSignal,
  cachedBytes?: Uint8Array<ArrayBuffer>,
): Promise<LoadedFont> {
  fontEngine(engine);
  checkAbort(signal);
  const backend =
    engine === "fontkite" ? await import("./font-engine-fontkite.js") : await import("./font-engine-fontkit.js");
  checkAbort(signal);
  let bytes: Uint8Array<ArrayBuffer> | undefined,
    started = 0;
  const font = await backend.loadFont(uri, {
    loader: {
      resolve: loader.resolve,
      load: async (source, options) => {
        bytes = cachedBytes ?? (await loader.load(source, options));
        checkAbort(signal);
        // Exclude module download and transport from the preparation measurement.
        started = performance.now();
        return bytes;
      },
    },
    ...(signal ? { signal } : {}),
  });
  checkAbort(signal);
  if (!bytes) throw new Error("Font loader did not provide bytes");
  return { bytes, font, preparationMs: performance.now() - started };
}
