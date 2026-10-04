import { fail, MetricSum, sum } from "@updf/core/internal";
import { derivedAxis } from "./axis.js";
import { bits, dyadic, spacing } from "./binary64.js";

export interface GeneratedInterval {
  readonly sourceStart: number;
  readonly sourceEnd: number;
  readonly semanticExtent: number;
}
export interface GeneratedAllocation {
  readonly start: number;
  readonly sharedEnd: number;
  readonly semanticExtent: number;
  readonly allocationExtent: number;
}
const owned = new WeakSet<GeneratedInterval>();
const fragments = new WeakMap<object, ReadonlySet<GeneratedInterval>>();

export function certifyGeneratedFragment<T extends object>(fragment: T, intervals: readonly GeneratedInterval[]): T {
  fragments.set(fragment, new Set(intervals));
  return fragment;
}

export function generatedFragmentStart(
  fragment: Readonly<{ height: number }>,
  interval: GeneratedInterval,
  origin: number,
  offset: number,
  extent: number,
  path: string,
): number {
  assertGeneratedPart(fragment, interval, offset, extent, path);
  return materializeGeneratedInterval(interval, origin, { sourceStart: 0, sourceEnd: fragment.height }, path).start;
}

export function assertGeneratedPart(
  owner: object,
  interval: GeneratedInterval,
  offset: number,
  extent: number,
  path: string,
): void {
  if (!fragments.get(owner)?.has(interval) || offset !== interval.sourceStart || extent !== interval.semanticExtent)
    fail("GEOMETRY", path, "Generated certificate does not own this fragment part.");
}

/** Both source endpoints belong to one private compensated metric sequence. */
export function generatedIntervals(): { append(extent: number, path: string): GeneratedInterval } {
  const sourceMetricSum = new MetricSum();
  return {
    append(semanticExtent, path) {
      if (!Number.isFinite(semanticExtent) || semanticExtent <= 0)
        fail("GEOMETRY", path, "Generated interval requires a finite positive semantic extent.");
      const sourceStart = sourceMetricSum.value;
      const sourceEnd = sourceMetricSum.add(semanticExtent);
      if (!Number.isFinite(sourceEnd) || sourceEnd <= sourceStart)
        fail("GEOMETRY", path, "Generated source interval must have finite ordered endpoints.");
      const interval = Object.freeze({ sourceStart, sourceEnd, semanticExtent });
      owned.add(interval);
      return interval;
    },
  };
}

export function materializeGeneratedInterval(
  interval: GeneratedInterval,
  origin: number,
  reservation: Readonly<{ sourceStart: number; sourceEnd: number }>,
  path: string,
): GeneratedAllocation {
  if (!owned.has(interval)) fail("GEOMETRY", path, "Generated interval is not privately owned.");
  const { sourceStart, sourceEnd, semanticExtent } = interval;
  if (
    !Number.isFinite(origin) ||
    origin < 0 ||
    !Number.isFinite(reservation.sourceStart) ||
    !Number.isFinite(reservation.sourceEnd) ||
    reservation.sourceStart < 0 ||
    reservation.sourceEnd <= reservation.sourceStart ||
    sourceStart < reservation.sourceStart ||
    sourceEnd > reservation.sourceEnd
  )
    fail("GEOMETRY", path, "Generated source interval exceeds its strict source reservation.");
  const start = sum([origin, sourceStart]);
  const sharedEnd = sum([origin, sourceEnd]);
  const enclosingStart = sum([origin, reservation.sourceStart]);
  const enclosingEnd = sum([origin, reservation.sourceEnd]);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(sharedEnd) ||
    !Number.isFinite(enclosingEnd) ||
    start < enclosingStart ||
    sharedEnd <= start ||
    sharedEnd > enclosingEnd
  )
    fail("GEOMETRY", path, "Generated shared interval exceeds its materialized reservation.");
  const allocationExtent =
    start + semanticExtent <= sharedEnd ? semanticExtent : certifiedExtent(start, sharedEnd, semanticExtent, path);
  if (start + allocationExtent > sharedEnd || start + allocationExtent > enclosingEnd)
    fail("GEOMETRY", path, "Generated native endpoint exceeds its materialized reservation.");
  return Object.freeze({ start, sharedEnd, semanticExtent, allocationExtent });
}

function certifiedExtent(start: number, end: number, semanticExtent: number, path: string): number {
  const { capacity } = derivedAxis(start, end, path);
  const residual = dyadic(bits(semanticExtent)) - dyadic(bits(capacity));
  if ((residual < 0n ? -residual : residual) > 32n * spacing(bits(semanticExtent)))
    fail("GEOMETRY", path, "Generated allocation residual exceeds the local precision budget.");
  return capacity;
}
