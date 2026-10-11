import colorUrl from "../../../tests/fixtures/jpeg/color-1x1.jpg?no-inline";
import grayUrl from "../../../tests/fixtures/jpeg/gray.jpg?no-inline";
import provenance from "../../../tests/fixtures/jpeg/README.md?raw";
import { jpegExample } from "./jpeg.js";
import { type JpegControls, jpegDefaults, validateJpegControls } from "./jpeg-controls.js";
import template from "./jpeg.ts?raw";
import controlsSource from "./jpeg-controls.ts?raw";
import loader from "./optional-jpeg.ts?raw";

const cached = new Map<string, Promise<Uint8Array>>();
function asset(variant: JpegControls["variant"]): Promise<Uint8Array> {
  const existing = cached.get(variant);
  if (existing) return existing;
  const pending = fetch(variant === "color" ? colorUrl : grayUrl)
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load original JPEG sample");
      return new Uint8Array(await response.arrayBuffer());
    })
    .catch((error: unknown) => {
      cached.delete(variant);
      throw error;
    });
  cached.set(variant, pending);
  return pending;
}

export async function jpegDemo(title: string, controls: JpegControls = jpegDefaults) {
  validateJpegControls(controls);
  return jpegExample(await asset(controls.variant), title, controls);
}

export const source = [
  "// apps/showcase/src/jpeg.ts",
  template,
  "// apps/showcase/src/jpeg-controls.ts",
  controlsSource,
  "// apps/showcase/src/optional-jpeg.ts (browser asset loader)",
  loader,
  "// tests/fixtures/jpeg/README.md (original MIT sample artwork)",
  provenance,
].join("\n\n");
