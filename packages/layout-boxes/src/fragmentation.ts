/** `@updf/layout-boxes/fragmentation`: bounded source-unit selection across host regions, without painting or pages. */
import { fail } from "./error.js";
import { CandidateStore } from "./fragment-candidates.js";
import { providerSnapshot, RangeState } from "./fragment-range.js";
import { type CursorState, flowRegion } from "./fragment-regions.js";
import { selectRange } from "./fragment-select.js";
import { candidateRequest, rangeRequest, safeInteger, validateSourceRequest } from "./fragment-source.js";
import type {
  CandidateCursor,
  CandidateEndpoint,
  CandidateRequest,
  FragmentCursor,
  FragmentLimits,
  FragmentOperation,
  FragmentProvider,
  FragmentRegion,
  FragmentView,
  PreparedSource,
} from "./fragment-types.js";
import { FragmentWork } from "./fragment-work.js";
import { record } from "./width-validation.js";

export type * from "./fragment-types.js";
export { fragmentDefaults } from "./fragment-work.js";
export { createRangeOperation } from "./fragment-range.js";

/**
 * Create a frozen synchronous operation with cumulative budgets (fragmentDefaults).
 * Prepared sources/cursors belong to this operation; each fragment call consumes
 * its cursor. Close explicitly when finished. Any guarded failure, reentrancy or
 * expired provider work use poisons the operation; it cannot be resumed.
 * Structural outputs are frozen, generic descriptors/content are not cloned or
 * frozen. Throws LayoutInputError for invalid contracts or exhausted budgets;
 * provider exceptions propagate. Callbacks are trusted code, not a CPU sandbox.
 */
export function createFragmentOperation<D, C>(
  providerInput: FragmentProvider<D, C>,
  limits?: FragmentLimits,
): FragmentOperation<D, C> {
  const provider = providerSnapshot(providerInput);
  const state = new OperationState(provider, new FragmentWork(limits));
  return Object.freeze<FragmentOperation<D, C>>({
    prepare: (source) => state.prepare(source),
    select: (source, request) => state.select(source, request),
    candidates: (source, request) => state.candidates(source, request),
    nextCandidate: (cursor) => state.nextCandidate(cursor),
    materializeCandidate: (endpoint) => state.materializeCandidate(endpoint),
    start: (view) => state.start(view),
    fragment: (cursor, region) => state.fragment(cursor, region),
    counts: () => state.work.counts(),
    close: () => state.poison(),
  });
}
class OperationState<D, C> extends RangeState<D, C> {
  private readonly candidateStore = new CandidateStore<D, C>();
  private cursors = new WeakMap<FragmentCursor, CursorState<D>>();
  private views = new WeakMap<FragmentView<D>, { entries: Map<number, PreparedSource>; seen: Set<PreparedSource> }>();
  protected override releaseCapabilities(): void {
    this.cursors = new WeakMap();
    this.views = new WeakMap();
    this.candidateStore.clear();
  }
  candidates = (prepared: PreparedSource, input: CandidateRequest) =>
    this.guard(() => {
      this.work.charge("attempts");
      this.work.charge("sourceVisits");
      const source = this.source(prepared);
      const request = candidateRequest(input);
      validateSourceRequest(source, request);
      return this.candidateStore.start(source, request);
    });
  nextCandidate = (token: CandidateCursor) =>
    this.guard(() => {
      this.work.charge("attempts");
      return this.candidateStore.next(token, this.provider!, this.work, this.poison, this.health);
    });
  materializeCandidate = (token: CandidateEndpoint) =>
    this.guard(() => {
      this.work.charge("attempts");
      return this.candidateStore.materialize(token, this.work);
    });
  private cursor = (state: CursorState<D>): FragmentCursor => {
    const token = Object.freeze({}) as FragmentCursor;
    this.cursors.set(token, Object.freeze(state));
    return token;
  };
  start = (view: FragmentView<D>) =>
    this.guard(() => {
      this.work.charge("attempts");
      const snapshot = viewSnapshot(view);
      this.work.capacity("sourceReads", snapshot.count);
      this.views.set(snapshot, { entries: new Map(), seen: new Set() });
      return this.cursor({ view: snapshot, index: 0, offset: 0 });
    });
  fragment = (token: FragmentCursor, input: FragmentRegion) =>
    this.guard(() => {
      this.work.charge("attempts");
      const state = this.cursors.get(token);
      if (!state) fail("VALUE", "/cursor", "Foreign or consumed cursor");
      this.cursors.delete(token);
      const region = regionSnapshot(input);
      return flowRegion(state, region, {
        read: (view, index) => {
          const prepared = this.read(view, index);
          const source = this.source(prepared);
          return { prepared, id: source.id, path: source.path, extent: source.extent };
        },
        select: (prepared, offset, usedHeight) =>
          selectRange(
            this.source(prepared),
            { offset, width: region.width, height: region.height, usedHeight },
            this.provider!,
            this.work,
            this.poison,
            this.health,
          ),
        cursor: this.cursor,
        output: () => this.work.charge("outputFragments"),
      });
    });
  private read(view: FragmentView<D>, index: number): PreparedSource {
    this.work.charge("sourceVisits");
    const { entries, seen } = this.views.get(view)!;
    const previous = entries.get(index);
    if (previous) return previous;
    this.work.charge("sourceReads");
    const input = view.at(index);
    this.health();
    const prepared = this.register(input);
    if (seen.has(prepared)) fail("VALUE", "/view", "Duplicate indexed source identity");
    seen.add(prepared);
    entries.set(index, prepared);
    return prepared;
  }
}
function viewSnapshot<D>(input: FragmentView<D>): FragmentView<D> {
  const data = record(input, ["count", "at"], "/view");
  const count = safeInteger(data.count, "/view/count");
  if (typeof data.at !== "function") fail("TYPE", "/view/at", "Expected indexed source reader");
  return Object.freeze({ count, at: data.at as FragmentView<D>["at"] });
}
function regionSnapshot(input: FragmentRegion): FragmentRegion {
  const data = record(input, ["id", "width", "height", "usedHeight"], "/region");
  if (typeof data.id !== "string" || !data.id) fail("TYPE", "/region/id", "Expected region identity");
  const range = rangeRequest({
    offset: 0,
    width: data.width as number,
    height: data.height as number,
    usedHeight: data.usedHeight as number,
  });
  return Object.freeze({ id: data.id, width: range.width, height: range.height, usedHeight: range.usedHeight });
}
