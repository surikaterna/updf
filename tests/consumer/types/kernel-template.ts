import { LayoutInputError, resolveWidths, type WidthResolution, type WidthTrack } from "@updf/layout-kernel";
import { bits, dyadic, floorDyadic, spacing, successor, value } from "@updf/layout-kernel/numeric";

const tracks: readonly WidthTrack[] = [20, { weight: 1, min: 1, max: 100 }];
const result: WidthResolution = resolveWidths({ availableWidth: 80, tracks, gap: 1 });
if (result.widths[1] !== 59 || !Object.isFrozen(result.widths)) throw new Error("Allocation failed");
const encoded = bits(1);
if (value(floorDyadic(dyadic(encoded)) ?? 0n) !== 1 || spacing(encoded) <= 0n || !successor(encoded))
  throw new Error("Numeric entry failed");
try {
  resolveWidths(null);
} catch (error) {
  if (!(error instanceof LayoutInputError) || error.code !== "TYPE" || error.path !== "/widths") throw error;
}
if (result.widths.length === 0) {
  // @ts-expect-error readonly result
  result.widths.push(1);
}
