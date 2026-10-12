import { createAssetLoader } from "@updf/assets";
import { loadFont } from "@updf/fontkit/load";
import type { PreparedFont } from "@updf/fonts";
import localUrl from "../../../tests/fixtures/fonts/LiberationSans-Regular.ttf?url";
import { type FontUriControls, fontUriDefaults, validateFontUriControls } from "./font-uri-controls.js";
import { fontUriExample } from "./font-uri.js";
import template from "./font-uri.tsx?raw";
import controlsSource from "./font-uri-controls.ts?raw";
import loaderSource from "./optional-font-uri.ts?raw";

const loader = createAssetLoader({ fetch: globalThis.fetch, maxBytes: 4 * 1024 * 1024, timeoutMs: 10000 });
let cached: { readonly uri: string; readonly font: PreparedFont } | undefined;

export async function fontUriDemo(title: string, controls: FontUriControls = fontUriDefaults, signal?: AbortSignal) {
  validateFontUriControls(controls);
  const uri = controls.uri || localUrl;
  if (signal?.aborted) throw new Error("Font loading was cancelled");
  const font = cached?.uri === uri ? cached.font : await loadFont(uri, { loader, ...(signal ? { signal } : {}) });
  if (signal?.aborted) throw new Error("Font loading was cancelled");
  cached = { uri, font };
  return {
    ...fontUriExample(font, title, controls.fontSize),
    origin: controls.uri ? "submitted URI" : "bundled sample",
  };
}

export const source = [
  "// apps/showcase/src/font-uri.tsx",
  template,
  "// apps/showcase/src/font-uri-controls.ts",
  controlsSource,
  "// apps/showcase/src/optional-font-uri.ts (browser loader; keeps one successful font)",
  loaderSource,
].join("\n\n");
