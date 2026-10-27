import { profile, requireData } from "./errors.js";
import type { ColorValidation } from "./parser.js";

const srgbChromaticities = [31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000];

function integer(view: DataView, offset: number): number {
  const value = view.getUint32(offset);
  requireData(value <= 0x7fffffff, "Invalid PNG color integer domain");
  return value;
}

function chromaticities(bytes: Uint8Array): boolean {
  requireData(bytes.length === 32, "Invalid cHRM length");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  for (let offset = 0; offset < 32; offset += 4) integer(view, offset);
  for (let offset = 0; offset < 32; offset += 8) {
    const x = view.getUint32(offset);
    const y = view.getUint32(offset + 4);
    // Conservative eligibility bounds, not a general PNG validity or gamut predicate.
    if (x > 100000 || y < 1 || y > 100000 || x + y > 100000) profile("Unsupported cHRM coordinates");
  }
  return srgbChromaticities.every((value, index) => view.getUint32(index * 4) === value);
}

/** Claims belong to one parse invocation, including failed or concurrently inflating sources. */
export function normalizationColor(): ColorValidation {
  let gamma: number | undefined;
  let standardChromaticities: boolean | undefined;
  return (type, bytes, state) => {
    if (type === "sRGB") {
      requireData(gamma === undefined || gamma === 45455, "Conflicting sRGB and gAMA");
      requireData(standardChromaticities !== false, "Conflicting sRGB and cHRM");
      return true;
    }
    if (type !== "gAMA" && type !== "cHRM") return false;
    requireData(!state.palette && !state.parts.length, `Misplaced ${type}`);
    if (type === "gAMA") {
      requireData(gamma === undefined && bytes.length === 4, "Duplicate or invalid gAMA");
      gamma = integer(new DataView(bytes.buffer, bytes.byteOffset, bytes.length), 0);
      if (gamma === 0) profile("Expected positive gAMA for normalization");
      requireData(!state.srgb || gamma === 45455, "Conflicting sRGB and gAMA");
    } else {
      requireData(standardChromaticities === undefined, "Duplicate cHRM");
      standardChromaticities = chromaticities(bytes);
      requireData(!state.srgb || standardChromaticities, "Conflicting sRGB and cHRM");
    }
    return true;
  };
}
