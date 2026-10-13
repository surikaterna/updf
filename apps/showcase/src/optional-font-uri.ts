import localUrl from "../../../tests/fixtures/fonts/LiberationSans-Regular.ttf?url";
import {
  activateFontUri,
  type FontEngine,
  type FontUriControls,
  fontUriDefaults,
  validateFontUriControls,
} from "./font-uri-controls.js";
import { fontUriExample } from "./font-uri.js";
import { type LoadedFont, loadSelectedFont } from "./font-uri-loader.js";
import template from "./font-uri.tsx?raw";
import controlsSource from "./font-uri-controls.ts?raw";
import loaderSource from "./optional-font-uri.ts?raw";
import engineLoaderSource from "./font-uri-loader.ts?raw";
import fontkitSource from "./font-engine-fontkit.ts?raw";
import fontkiteSource from "./font-engine-fontkite.ts?raw";

let cached:
  | {
      readonly uri: string;
      readonly bytes: Uint8Array<ArrayBuffer>;
      readonly fonts: Partial<Record<FontEngine, LoadedFont>>;
    }
  | undefined;

export async function fontUriDemo(title: string, controls: FontUriControls = fontUriDefaults, signal?: AbortSignal) {
  validateFontUriControls(controls);
  const uri = controls.uri || localUrl;
  if (signal?.aborted) throw new Error("Font loading was cancelled");
  const previous = cached?.uri === uri ? cached : undefined;
  const reused = previous?.fonts[controls.engine];
  const loaded = reused ?? (await loadSelectedFont(uri, controls.engine, signal, previous?.bytes));
  if (signal?.aborted) throw new Error("Font loading was cancelled");
  const result = fontUriExample(loaded.font, title, controls.fontSize);
  cached = { uri, bytes: loaded.bytes, fonts: { ...previous?.fonts, [controls.engine]: loaded } };
  activateFontUri(controls.uri, controls.engine);
  return {
    ...result,
    origin: controls.uri ? "submitted URI" : "bundled sample",
    engine: controls.engine === "fontkite" ? "Fontkite" : "Fontkit",
    preparationMs: loaded.preparationMs,
    cached: !!reused,
  };
}

export const source = [
  "// apps/showcase/src/font-uri.tsx",
  template,
  "// apps/showcase/src/font-uri-controls.ts",
  controlsSource,
  "// apps/showcase/src/font-uri-loader.ts (explicit lazy engine selection)",
  engineLoaderSource,
  "// apps/showcase/src/font-engine-fontkit.ts",
  fontkitSource,
  "// apps/showcase/src/font-engine-fontkite.ts",
  fontkiteSource,
  "// apps/showcase/src/optional-font-uri.ts (one successful URI; prepared handles keyed by engine)",
  loaderSource,
].join("\n\n");
