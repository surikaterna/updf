import { fail, finite, number, validateDataObject } from "@updf/core/internal";
import { exceeds } from "./arithmetic.js";
import type { RectangularExclusion } from "./composition-types.js";
import type { TextLineMeasurement } from "./types.js";

export interface Exclusion extends RectangularExclusion {
  readonly top: number;
  readonly bottom: number;
}
export function exclusion(value: RectangularExclusion, width: number, path: string): Exclusion {
  validateDataObject(value, ["shape", "side", "width", "height", "top"], path);
  if (value.shape !== "rect") fail("VALUE", `${path}/shape`, "Expected rect");
  if (value.side !== "left" && value.side !== "right") fail("VALUE", `${path}/side`, "Expected left or right");
  number(value.width, `${path}/width`, true);
  number(value.height, `${path}/height`, true);
  const top = value.top === undefined ? 0 : number(value.top, `${path}/top`);
  if (value.width > width) fail("GEOMETRY", `${path}/width`, "Reservation exceeds frame width");
  const bottom = finite(top + value.height, path);
  if (bottom <= top) fail("GEOMETRY", path, "Reservation height must advance its bottom");
  return { ...value, top, bottom };
}
function separated(bottom: number, top: number, scale: number): boolean {
  // Exact touching is disjoint; uncertain positive gaps remain conservatively occupied.
  return bottom === top || exceeds(top, bottom, scale);
}
export type SelectionBand = readonly [number, number] | ((top: number) => readonly [number, number]);
export function interval(rect: Exclusion, width: number, top: number, band: SelectionBand, path: string) {
  const [low, high] =
    typeof band === "function" ? band(top) : [finite(top + band[0], path), finite(top + band[1], path)];
  const scale = Math.max(Math.abs(top), Math.abs(low), Math.abs(high));
  const active = !separated(high, rect.top, scale) && !separated(rect.bottom, low, scale);
  return {
    active,
    origin: active && rect.side === "left" ? rect.width : 0,
    width: active ? finite(width - rect.width, path) : width,
  };
}
export function jump(rect: Exclusion, top: number, low: number, path: string): number {
  const next = finite(rect.bottom - low, path);
  if (next <= top) fail("GEOMETRY", path, "Reservation jump cannot make strict progress");
  return next;
}
export function validateExcludedLine(line: TextLineMeasurement, rect: Exclusion, width: number, path: string): void {
  const ink = line.inkBounds;
  const top = ink.empty ? line.top : Math.min(line.top, ink.top);
  const bottom = ink.empty ? line.top + line.height : Math.max(line.top + line.height, ink.bottom);
  if (bottom <= rect.top || top >= rect.bottom) return;
  const left = rect.side === "left" ? rect.width : 0;
  const right = rect.side === "right" ? width - rect.width : width;
  for (const fragment of line.fragments) {
    const bounds = fragment.inkBounds;
    const scale = Math.max(Math.abs(fragment.x), fragment.advance, fragment.style.fontSize, left);
    if (
      exceeds(left, fragment.x, scale) ||
      exceeds(fragment.x + fragment.advance, right) ||
      (!bounds.empty && (exceeds(left, bounds.left, scale) || exceeds(bounds.right, right)))
    )
      fail("FONT_INK", path, "Selected text intersects reserved edge");
  }
}
