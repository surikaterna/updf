import { MetricSum, sum } from "./arithmetic.js";
import type { BoxStyle } from "./box-types.js";
import { fail } from "./error.js";
import { alignedTop } from "./geometry.js";
import { number } from "./width-validation.js";

/** Prepared nonnegative finite host lengths; no intrinsic measurement is performed. */
export interface ResolvedBoxSize {
  readonly width: number;
  readonly height: number;
}
/** Offset relative to parent content origin, excluding its padding; y increases downwards. */
export interface BoxOffset extends ResolvedBoxSize {
  readonly left: number;
  readonly top: number;
}
/** Frozen prepared placement with child offsets and retained host box height. */
export interface BoxPlacement {
  readonly height: number;
  readonly children: readonly BoxOffset[];
}
export interface PlacementStyle {
  readonly flexDirection: "row" | "column";
  readonly alignItems: NonNullable<BoxStyle["alignItems"]>;
  readonly top: number;
  readonly bottom: number;
  readonly vertical: number;
  readonly gap: number;
}
export function naturalHeight(style: PlacementStyle, children: readonly ResolvedBoxSize[]): number {
  if (style.flexDirection === "row")
    return sum([style.vertical, children.reduce((max, child) => Math.max(max, child.height), 0)]);
  return sum([style.vertical, ...children.map((child) => child.height), Math.max(0, children.length - 1) * style.gap]);
}
/** Shared placement for fresh boxes and already-certified prepared host sizes. */
export function placeResolved(
  style: PlacementStyle,
  height: number,
  sizes: readonly ResolvedBoxSize[],
  path: string,
): BoxPlacement {
  const cursor = new MetricSum();
  const children = sizes.map((size) => {
    const row = style.flexDirection === "row";
    const extent = row && style.alignItems === "stretch" ? Math.max(size.height, height - style.vertical) : size.height;
    const left = row ? cursor.value : 0;
    const top = row
      ? alignedTop(style.top, style.bottom, style.vertical, height, extent, style.alignItems, path)
      : cursor.value;
    number(left, path);
    number(top, path);
    number(extent, path);
    if (!Number.isFinite(left + size.width) || !Number.isFinite(top + extent))
      fail("GEOMETRY", path, "Nonfinite box placement");
    cursor.add(row ? size.width : extent);
    cursor.add(style.gap);
    return Object.freeze({ left, top, width: size.width, height: extent });
  });
  return Object.freeze({ height, children: Object.freeze(children) });
}
