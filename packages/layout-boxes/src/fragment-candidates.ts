import { fail } from "./error.js";
import { nextUnit, UnitSequence } from "./fragment-select.js";
import type {
  CandidateCursor,
  CandidateEndpoint,
  CandidateRequest,
  CandidateResult,
  FragmentProvider,
  FragmentSource,
  SelectedRange,
} from "./fragment-types.js";
import type { FragmentWork } from "./fragment-work.js";

interface Enumeration<D, C> {
  readonly source: FragmentSource<D>;
  readonly request: CandidateRequest;
  readonly sequence: UnitSequence<C>;
}
interface Prefix<C> {
  readonly sequence: UnitSequence<C>;
  readonly length: number;
  readonly start: number;
  readonly end: number;
  readonly height: number;
}
/** Only these replaceable weak maps retain sequences; tokens never point back at their owner. */
export class CandidateStore<D, C> {
  private cursors = new WeakMap<CandidateCursor, Enumeration<D, C>>();
  private endpoints = new WeakMap<CandidateEndpoint, Prefix<C>>();
  clear(): void {
    this.cursors = new WeakMap();
    this.endpoints = new WeakMap();
  }
  start(source: FragmentSource<D>, request: CandidateRequest): CandidateCursor {
    return this.cursor({ source, request, sequence: new UnitSequence<C>(request.offset) });
  }
  private cursor(state: Enumeration<D, C>): CandidateCursor {
    const token = Object.freeze({}) as CandidateCursor;
    this.cursors.set(token, state);
    return token;
  }
  next(
    token: CandidateCursor,
    provider: FragmentProvider<D, C>,
    work: FragmentWork,
    poison: () => void,
    health: () => void,
  ): CandidateResult {
    const state = this.cursors.get(token);
    if (!state) fail("VALUE", "/cursor", "Foreign or consumed candidate cursor");
    this.cursors.delete(token);
    const { source, request, sequence } = state;
    if (sequence.offset === source.extent) return Object.freeze({ done: true });
    const unit = nextUnit(source, sequence.offset, request.width, provider, work, poison, health);
    health();
    work.charge("outputFragments");
    const top = sequence.height.value;
    const start = sequence.offset;
    sequence.accept(unit);
    if (!Number.isFinite(sequence.height.value)) fail("GEOMETRY", source.path, "Candidate height overflow");
    const endpoint = Object.freeze({
      start: request.offset,
      end: sequence.offset,
      height: sequence.height.value,
      unit: Object.freeze({ start, end: unit.end, height: unit.height, top }),
    }) as CandidateEndpoint;
    this.endpoints.set(endpoint, {
      sequence,
      length: sequence.units.length,
      start: endpoint.start,
      end: endpoint.end,
      height: endpoint.height,
    });
    return Object.freeze({ done: false, endpoint, cursor: this.cursor(state) });
  }
  materialize(token: CandidateEndpoint, work: FragmentWork): SelectedRange<C> {
    const prefix = this.endpoints.get(token);
    if (!prefix) fail("VALUE", "/endpoint", "Foreign candidate endpoint");
    work.charge("outputFragments", prefix.length);
    return Object.freeze({
      start: prefix.start,
      end: prefix.end,
      height: prefix.height,
      units: Object.freeze(prefix.sequence.units.slice(0, prefix.length)),
    });
  }
}
