import colorUrl from "../../../tests/fixtures/png/color-alpha.png?no-inline";
import grayUrl from "../../../tests/fixtures/png/gray-alpha.png?no-inline";
import provenance from "../../../tests/fixtures/png/README.md?raw";
import { pngExample } from "./png.js";
import { type PngControls, pngDefaults, validatePngControls } from "./png-controls.js";
import template from "./png.ts?raw";
import controlsSource from "./png-controls.ts?raw";
import loader from "./optional-png.ts?raw";

const cached = new Map<string, Promise<Uint8Array>>();
function asset(variant: PngControls["variant"]): Promise<Uint8Array> {
  const existing = cached.get(variant);
  if (existing) return existing;
  const pending = fetch(variant === "color" ? colorUrl : grayUrl)
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load original PNG sample");
      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error: unknown) => {
      cached.delete(variant);
      throw error;
    });
  cached.set(variant, pending);
  return pending;
}

export async function pngDemo(title: string, controls: PngControls = pngDefaults) {
  validatePngControls(controls);
  return pngExample(await asset(controls.variant), title, controls);
}

export const source = [
  "// apps/showcase/src/png.ts",
  template,
  "// apps/showcase/src/png-controls.ts",
  controlsSource,
  "// apps/showcase/src/optional-png.ts (browser asset loader)",
  loader,
  "// tests/fixtures/png/README.md (original MIT sample artwork)",
  provenance,
].join("\n\n");
