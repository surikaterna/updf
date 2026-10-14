import { bits, dyadic, floorDyadic, value } from "./binary64.js";
import { distribute } from "./width-distribution.js";
import { widthInput } from "./width-input.js";
import type { WidthResolution, WidthResolutionInput } from "./width-types.js";

function floor(integer: bigint): number {
  return integer < 2n ? 0 : value(floorDyadic(integer) ?? 0n);
}
function ceil(integer: bigint): number {
  const lower = floor(integer);
  return dyadic(bits(lower)) === integer ? lower : value(bits(lower) + 1n);
}
/**
 * Allocate positive point widths after reserving uniform gaps, without mutating input.
 * Weighted tracks share remaining space subject to min/max bounds; capped tracks may
 * leave unused space. Results and width arrays are frozen. Binary64 rounding never
 * overallocates; residual ULPs are assigned in stable input order.
 * @param path Diagnostic JSON-pointer prefix; defaults to `/widths`.
 * @throws LayoutInputError for invalid data, exceeded track budgets or infeasible minima.
 * Host proxy exceptions propagate unchanged; validation is not a sandbox.
 */
export function resolveWidths(input: WidthResolutionInput, path?: string): WidthResolution;
/** Runtime-validation overload for untrusted data; same allocation contract as the typed overload. */
export function resolveWidths(input: unknown, path?: string): WidthResolution;
export function resolveWidths(input: unknown, path = "/widths"): WidthResolution {
  const { available, gap, gaps, tracks } = widthInput(input, path);
  const targets = distribute(tracks, available - gaps);
  const widths = targets.map((target) => floor(target.numerator / target.denominator));
  let remaining = available - gaps - widths.reduce((sum, width) => sum + dyadic(bits(width)), 0n);
  // Stable input order owns residual ULPs; never change fixed tracks or exceed a maximum.
  tracks.forEach((track, i) => {
    if (track.weight === 0n || remaining === 0n) return;
    const current = dyadic(bits(widths[i] ?? 0));
    const target = targets[i];
    if (!target || current * target.denominator === target.numerator) return;
    const rounded = value(bits(widths[i] ?? 0) + 1n);
    const increment = dyadic(bits(rounded)) - current;
    if (increment > remaining || dyadic(bits(rounded)) > track.max) return;
    widths[i] = rounded;
    remaining -= increment;
  });
  return Object.freeze({
    widths: Object.freeze(widths),
    gap,
    occupiedWidth: ceil(available - remaining),
    unusedWidth: floor(remaining),
  });
}
