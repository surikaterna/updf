import { array, checkLimit, fail, number, validateDataObject as record } from "@updf/core/internal";
import { bits, dyadic } from "./binary64.js";

export const exact = (value: number): bigint => dyadic(bits(value));
export interface Track {
  readonly min: bigint;
  readonly max: bigint;
  readonly weight: bigint;
}
function track(value: unknown, available: bigint, path: string): Track {
  if (typeof value === "number") {
    const width = exact(number(value, path, true));
    return { min: width, max: width, weight: 0n };
  }
  record(value, ["weight", "min", "max"], path);
  const weight = exact(number(value.weight, `${path}/weight`, true));
  const min = "min" in value ? exact(number(value.min, `${path}/min`, true)) : exact(Number.MIN_VALUE);
  const max = "max" in value ? exact(number(value.max, `${path}/max`, true)) : available;
  if (max < min) fail("GEOMETRY", `${path}/max`, "Maximum width must be at least minimum width");
  return { min, max, weight };
}
export function widthInput(input: unknown, path: string) {
  record(input, ["availableWidth", "tracks", "gap", "maxTracks"], path);
  const available = exact(number(input.availableWidth, `${path}/availableWidth`, true));
  const gap = "gap" in input ? number(input.gap, `${path}/gap`) : 0;
  const maximum = "maxTracks" in input ? input.maxTracks : 10000;
  if (typeof maximum !== "number") fail("TYPE", `${path}/maxTracks`, "Expected track count budget");
  checkLimit(maximum, Number.MAX_SAFE_INTEGER, `${path}/maxTracks`, "Track count budget");
  array(input.tracks, maximum, `${path}/tracks`);
  if (!input.tracks.length) fail("VALUE", `${path}/tracks`, "At least one track is required");
  const gaps = exact(gap) * BigInt(input.tracks.length - 1);
  const tracks = input.tracks.map((item, i) => track(item, available, `${path}/tracks/${i}`));
  const minimum = tracks.reduce((sum, item) => sum + item.min, gaps);
  if (minimum > available)
    fail("GEOMETRY", `${path}/tracks`, "Fixed widths, minimum widths and gaps exceed available width");
  return { available, gap, gaps, tracks };
}
