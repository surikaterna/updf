import colorUrl from "../../../tests/fixtures/png/color-alpha.png?no-inline";
import grayUrl from "../../../tests/fixtures/png/gray-alpha.png?no-inline";
import provenance from "../../../tests/fixtures/png/README.md?raw";
import { pngExample } from "./png.js";
import { type PngControls, pngDefaults, validatePngControls } from "./png-controls.js";
import template from "./png.ts?raw";
import controlsSource from "./png-controls.ts?raw";
import loader from "./optional-png.ts?raw";

const cached = new Map<string, Uint8Array>();
async function asset(variant: PngControls["variant"], signal?: AbortSignal): Promise<Uint8Array> {
  signal?.throwIfAborted();
  const existing = cached.get(variant);
  if (existing) return existing;
  const timeout = new AbortController();
  const request = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
  const timer = setTimeout(() => timeout.abort(new Error("PNG sample request timed out; try again")), 10000);
  try {
    const response = await fetch(variant === "color" ? colorUrl : grayUrl, { signal: request });
    if (!response.ok) throw new Error("Unable to load original PNG sample");
    const bytes = new Uint8Array(await response.arrayBuffer());
    request.throwIfAborted();
    return bytes;
  } finally {
    clearTimeout(timer);
    timeout.abort();
  }
}

export async function pngDemo(title: string, controls: PngControls = pngDefaults, signal?: AbortSignal) {
  validatePngControls(controls);
  const bytes = await asset(controls.variant, signal);
  signal?.throwIfAborted();
  const result = pngExample(bytes, title, controls);
  cached.set(controls.variant, bytes);
  return result;
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
