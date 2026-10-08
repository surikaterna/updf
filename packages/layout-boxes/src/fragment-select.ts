import { exceeds, MetricSum, sum } from "./arithmetic.js";
import { fail } from "./error.js";
import { safeInteger } from "./fragment-source.js";
import type { FragmentProvider, FragmentSource, FragmentUnit, RangeRequest, SelectedRange } from "./fragment-types.js";
import type { FragmentWork } from "./fragment-work.js";
import { number, record } from "./width-validation.js";

export function selectRange<D, C>(
  source: FragmentSource<D>,
  request: RangeRequest,
  provider: FragmentProvider<D, C>,
  work: FragmentWork,
  poison: () => void,
  health: () => void,
): SelectedRange<C> | undefined {
  if (source.width.mode === "fixed" && request.width !== source.width.value)
    fail("VALUE", source.path, "Prepared source width mismatch");
  if (
    request.offset > source.extent ||
    (source.mode === "atomic" && request.offset !== 0 && request.offset !== source.extent)
  )
    fail("VALUE", source.path, "Invalid source offset");
  const height = new MetricSum();
  const units: FragmentUnit<C>[] = [];
  let offset = request.offset;
  while (offset < source.extent) {
    const unit = nextUnit(source, offset, request.width, provider, work, poison, health);
    if (exceeds(sum([request.usedHeight, height.value, unit.height]), request.height)) break;
    health();
    work.charge("outputFragments");
    units.push(Object.freeze({ start: offset, end: unit.end, height: unit.height, content: unit.content }));
    height.add(unit.height);
    offset = unit.end;
  }
  if (!units.length && request.offset !== source.extent) return undefined;
  return Object.freeze({ start: request.offset, end: offset, height: height.value, units: Object.freeze(units) });
}
function nextUnit<D, C>(
  source: FragmentSource<D>,
  offset: number,
  width: number,
  provider: FragmentProvider<D, C>,
  work: FragmentWork,
  poison: () => void,
  health: () => void,
): { end: number; height: number; content: C } {
  work.charge("unitsExamined");
  work.charge("measurements");
  const result = work.callback(
    (handle) => provider.next(source.descriptor, Object.freeze({ offset, extent: source.extent, width }), handle),
    poison,
    health,
  );
  const data = record(result, ["end", "height", "content"], source.path);
  const end = safeInteger(data.end, source.path);
  if (end <= offset || end > source.extent || (source.mode === "atomic" && end !== source.extent))
    fail("VALUE", source.path, "Provider must return one progressing legal unit");
  if (!Object.hasOwn(data, "content")) fail("TYPE", source.path, "Expected unit content");
  return { end, height: number(data.height, source.path), content: data.content as C };
}
