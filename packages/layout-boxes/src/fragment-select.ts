import { exceeds, MetricSum, sum } from "./arithmetic.js";
import { fail } from "./error.js";
import { safeInteger, validateSourceRequest } from "./fragment-source.js";
import type {
  FragmentProvider,
  FragmentSource,
  FragmentUnit,
  SelectedRange,
  SelectionRequest,
} from "./fragment-types.js";
import type { FragmentWork } from "./fragment-work.js";
import { number, record } from "./width-validation.js";

export function selectRange<D, C>(
  source: FragmentSource<D>,
  request: SelectionRequest,
  provider: FragmentProvider<D, C>,
  work: FragmentWork,
  poison: () => void,
  health: () => void,
): SelectedRange<C> | undefined {
  validateSourceRequest(source, request);
  const sequence = new UnitSequence<C>(request.offset);
  while (sequence.offset < source.extent) {
    const unit = nextUnit(source, sequence.offset, request.width, provider, work, poison, health);
    if (
      request.mode !== "complete" &&
      exceeds(sum([request.usedHeight, sequence.height.value, unit.height]), request.height)
    )
      break;
    health();
    work.charge("outputFragments");
    sequence.accept(unit);
    if (request.mode === "complete" && !Number.isFinite(sequence.height.value))
      fail("GEOMETRY", source.path, "Complete selection height must be finite");
  }
  if (!sequence.units.length && request.offset !== source.extent) return undefined;
  return Object.freeze({
    start: request.offset,
    end: sequence.offset,
    height: sequence.height.value,
    units: Object.freeze(sequence.units),
  });
}
/** One append-only owner for unit records and compensated height in both selection paths. */
export class UnitSequence<C> {
  readonly height = new MetricSum();
  readonly units: FragmentUnit<C>[] = [];
  constructor(public offset: number) {}
  accept(unit: { end: number; height: number; content: C }): void {
    this.units.push(Object.freeze({ start: this.offset, end: unit.end, height: unit.height, content: unit.content }));
    this.height.add(unit.height);
    this.offset = unit.end;
  }
}
export function nextUnit<D, C>(
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
