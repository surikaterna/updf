import { fail } from "@updf/core/internal";
import type { RGB } from "@updf/core/painting";

/** Normalized 0..1 RGB and alpha; null RGB means no paint. Not runtime-frozen. */
export interface ParsedColor {
  readonly rgb: RGB | null;
  readonly opacity: number;
}
/**
 * Parse hex (3/4/6/8 digits), comma rgb/rgba, black/white/red/green/blue,
 * none or transparent, ignoring surrounding whitespace and case. RGB channels
 * are 0..255 or percentages; alpha is 0..1 or a percentage. No clamping,
 * hsl(), currentColor or full CSS named-color support; rejects with DocumentError.
 */
export function parseColor(input: string): ParsedColor {
  if (typeof input !== "string") fail("PAINT", "/color", "Expected color string");
  const text = input.trim().toLowerCase();
  if (text === "none") return { rgb: null, opacity: 1 };
  if (text === "transparent") return { rgb: [0, 0, 0], opacity: 0 };
  const named: Readonly<Record<string, RGB>> = {
    black: [0, 0, 0],
    white: [1, 1, 1],
    red: [1, 0, 0],
    green: [0, 128 / 255, 0],
    blue: [0, 0, 1],
  };
  const known = Object.hasOwn(named, text) ? named[text] : undefined;
  if (known) return { rgb: known, opacity: 1 };
  if (/^#[\da-f]{3,4}$/.test(text) || /^#[\da-f]{6}([\da-f]{2})?$/.test(text)) {
    const hex = text.length <= 5 ? Array.from(text.slice(1), (char) => char + char).join("") : text.slice(1);
    const channel = (offset: number): number => parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return {
      rgb: [channel(0), channel(2), channel(4)],
      opacity: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1,
    };
  }
  const match = /^(rgb|rgba)\(([^)]+)\)$/.exec(text);
  const mode = match?.[1],
    values = match?.[2]?.split(",").map((value) => value.trim());
  if (!values || values.length !== (mode === "rgba" ? 4 : 3)) fail("PAINT", "/color", "Unsupported color grammar");
  const channel = (value: string | undefined, alpha = false): number => {
    if (!value || !/^(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(value)) fail("PAINT", "/color", "Malformed color component");
    const n = Number(value.replace("%", "")) / (value.endsWith("%") ? 100 : alpha ? 1 : 255);
    if (!Number.isFinite(n) || n < 0 || n > 1) fail("PAINT", "/color", "Color component out of range");
    return n;
  };
  return {
    rgb: [channel(values[0]), channel(values[1]), channel(values[2])],
    opacity: mode === "rgba" ? channel(values[3], true) : 1,
  };
}
