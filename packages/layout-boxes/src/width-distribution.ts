import type { Track } from "./width-input.js";

interface Ratio {
  readonly numerator: bigint;
  readonly denominator: bigint;
}
interface Event extends Ratio {
  readonly slope: bigint;
  readonly intercept: bigint;
}
const compare = (a: Ratio, b: Ratio): number => {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
function events(tracks: readonly Track[]): Event[] {
  return tracks
    .filter((track) => track.weight > 0n && track.min < track.max)
    .flatMap(({ min, max, weight }) => [
      { numerator: min, denominator: weight, slope: weight, intercept: -min },
      { numerator: max, denominator: weight, slope: -weight, intercept: max },
    ])
    .sort(compare);
}
function multiplier(tracks: readonly Track[], budget: bigint): Ratio | undefined {
  let intercept = tracks.reduce((sum, track) => sum + track.min, 0n);
  let slope = 0n;
  for (const event of events(tracks)) {
    if (slope > 0n) {
      const candidate = { numerator: budget - intercept, denominator: slope };
      if (compare(candidate, event) <= 0) return candidate;
    }
    slope += event.slope;
    intercept += event.intercept;
  }
  return undefined;
}
/** Exact bounded water filling: each breakpoint starts or saturates a weighted share. */
export function distribute(tracks: readonly Track[], budget: bigint): readonly Ratio[] {
  const lambda = multiplier(tracks, budget);
  return tracks.map((track) => {
    if (track.weight === 0n) return { numerator: track.min, denominator: 1n };
    if (!lambda) return { numerator: track.max, denominator: 1n };
    const target = { numerator: lambda.numerator * track.weight, denominator: lambda.denominator };
    if (target.numerator < track.min * target.denominator) return { numerator: track.min, denominator: 1n };
    if (target.numerator > track.max * target.denominator) return { numerator: track.max, denominator: 1n };
    return target;
  });
}
