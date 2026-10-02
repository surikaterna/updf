import type { Image } from "./compare.js";

interface Ink {
  readonly strength: number;
  readonly color: readonly [number, number, number];
}
function ink(image: Image, index: number): Ink {
  const r = 255 - (image.rgb[index * 3] ?? 255);
  const g = 255 - (image.rgb[index * 3 + 1] ?? 255);
  const b = 255 - (image.rgb[index * 3 + 2] ?? 255);
  const peak = Math.max(r, g, b);
  return { strength: peak > 3 ? peak / 255 : 0, color: peak ? [r / peak, g / peak, b / peak] : [0, 0, 0] };
}
function match(image: Image, x: number, y: number, expected: Ink): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const px = x + dx,
        py = y + dy;
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
      const candidate = ink(image, py * image.width + px);
      if (candidate.strength && expected.color.every((value, i) => Math.abs(value - (candidate.color[i] ?? 0)) <= 0.08))
        return true;
    }
  }
  return false;
}
function direction(a: Image, b: Image): { mass: number; unmatched: number } {
  let mass = 0,
    unmatched = 0;
  for (let i = 0; i < a.width * a.height; i++) {
    const expected = ink(a, i);
    if (!expected.strength) continue;
    mass += expected.strength;
    if (!match(b, i % a.width, Math.floor(i / a.width), expected)) unmatched += expected.strength;
  }
  return { mass, unmatched };
}
/** White-composited contrast normalizes antialias coverage without erasing hue.
 * Every foreground pixel (including all edge-band strokes) participates. Symmetric
 * 1px matching catches missing/misplaced/colored strokes; mass catches opacity loss.
 */
export function foreground(
  a: Image,
  b: Image,
): { foregroundMismatchRatio: number; inkMassDeltaRatio: number; foregroundMass: number } {
  const ab = direction(a, b),
    ba = direction(b, a);
  const mass = Math.max(ab.mass, ba.mass);
  return {
    foregroundMismatchRatio: Math.max(ab.unmatched / Math.max(ab.mass, 1), ba.unmatched / Math.max(ba.mass, 1)),
    inkMassDeltaRatio: Math.abs(ab.mass - ba.mass) / Math.max(mass, 1),
    foregroundMass: mass,
  };
}
