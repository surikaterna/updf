import { bits, dyadic } from "./binary64.js";
import { fail } from "./error.js";
import { array, number, record, trackLimit } from "./width-validation.js";

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
  const data = record(value, ["weight", "min", "max"], path);
  const weight = exact(number(data.weight, `${path}/weight`, true));
  const min = "min" in data ? exact(number(data.min, `${path}/min`, true)) : exact(Number.MIN_VALUE);
  const max = "max" in data ? exact(number(data.max, `${path}/max`, true)) : available;
  if (max < min) fail("GEOMETRY", `${path}/max`, "Maximum width must be at least minimum width");
  return { min, max, weight };
}
export function widthInput(input: unknown, path: string) {
  const data = record(input, ["availableWidth", "tracks", "gap", "maxTracks"], path);
  const available = exact(number(data.availableWidth, `${path}/availableWidth`, true));
  const gap = "gap" in data ? number(data.gap, `${path}/gap`) : 0;
  const maximum = "maxTracks" in data ? data.maxTracks : 10000;
  if (typeof maximum !== "number") fail("TYPE", `${path}/maxTracks`, "Expected track count budget");
  trackLimit(maximum, `${path}/maxTracks`);
  array(data.tracks, maximum, `${path}/tracks`);
  if (!data.tracks.length) fail("VALUE", `${path}/tracks`, "At least one track is required");
  const gaps = exact(gap) * BigInt(data.tracks.length - 1);
  const tracks = data.tracks.map((item, i) => track(item, available, `${path}/tracks/${i}`));
  const minimum = tracks.reduce((sum, item) => sum + item.min, gaps);
  if (minimum > available)
    fail("GEOMETRY", `${path}/tracks`, "Fixed widths, minimum widths and gaps exceed available width");
  return { available, gap, gaps, tracks };
}
