/** `@updf/layout-kernel/fragmentation`: bounded source-unit selection across host regions, without painting or pages. */
import { fail } from "./error.js";
import { type CursorState, flowRegion } from "./fragment-regions.js";
import { selectRange } from "./fragment-select.js";
import { rangeRequest, safeInteger, sourceSnapshot } from "./fragment-source.js";
import type {
  FragmentCursor,
  FragmentLimits,
  FragmentOperation,
  FragmentProvider,
  FragmentRegion,
  FragmentSource,
  FragmentView,
  PreparedSource,
  RangeRequest,
} from "./fragment-types.js";
import { FragmentWork } from "./fragment-work.js";
import { record } from "./width-validation.js";

export type * from "./fragment-types.js";
export { fragmentDefaults } from "./fragment-work.js";

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
  const data = record(providerInput, ["next"], "/provider");
  if (typeof data.next !== "function") fail("TYPE", "/provider/next", "Expected provider callback");
  const provider = Object.freeze({ next: data.next }) as FragmentProvider<D, C>;
  const state = new OperationState(provider, new FragmentWork(limits));
  return Object.freeze<FragmentOperation<D, C>>({
    prepare: (source) => state.prepare(source),
    select: (source, request) => state.select(source, request),
    start: (view) => state.start(view),
    fragment: (cursor, region) => state.fragment(cursor, region),
    counts: () => state.work.counts(),
    close: () => state.poison(),
  });
}
class OperationState<D, C> {
  private sources = new WeakMap<PreparedSource, FragmentSource<D>>();
  private readonly ids = new Map<string, PreparedSource>();
  private readonly descriptors = new Map<D, string>();
  private cursors = new WeakMap<FragmentCursor, CursorState<D>>();
  private views = new WeakMap<FragmentView<D>, { entries: Map<number, PreparedSource>; seen: Set<PreparedSource> }>();
  private active = true;
  private running = false;
  constructor(
    private provider: FragmentProvider<D, C> | undefined,
    readonly work: FragmentWork,
  ) {}
  poison = (): void => {
    this.active = false;
    this.provider = undefined;
    this.ids.clear();
    this.descriptors.clear();
    this.sources = new WeakMap();
    this.cursors = new WeakMap();
    this.views = new WeakMap();
  };
  private health = (): void => {
    if (!this.active) fail("VALUE", "/operation", "Fragment operation is closed");
  };
  private guard<T>(run: () => T): T {
    try {
      this.health();
      if (this.running) fail("VALUE", "/operation", "Reentrant fragment operations are not supported");
      this.running = true;
      const result = run();
      this.health();
      return result;
    } catch (error) {
      this.poison();
      throw error;
    } finally {
      this.running = false;
    }
  }
  prepare = (input: FragmentSource<D>): PreparedSource =>
    this.guard(() => {
      this.work.charge("sourceReads");
      return registerSource(sourceSnapshot(input), this.sources, this.ids, this.descriptors);
    });
  select = (prepared: PreparedSource, input: RangeRequest) =>
    this.guard(() => {
      this.work.charge("attempts");
      this.work.charge("sourceVisits");
      const source = this.sources.get(prepared);
      if (!source) fail("VALUE", "/source", "Foreign prepared source");
      return selectRange(source, rangeRequest(input), this.provider!, this.work, this.poison, this.health);
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
          const source = this.sources.get(prepared)!;
          return { prepared, id: source.id, path: source.path, extent: source.extent };
        },
        select: (prepared, offset, usedHeight) =>
          selectRange(
            this.sources.get(prepared)!,
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
    const prepared = registerSource(sourceSnapshot(input), this.sources, this.ids, this.descriptors);
    if (seen.has(prepared)) fail("VALUE", "/view", "Duplicate indexed source identity");
    seen.add(prepared);
    entries.set(index, prepared);
    return prepared;
  }
}
function registerSource<D>(
  source: FragmentSource<D>,
  sources: WeakMap<PreparedSource, FragmentSource<D>>,
  ids: Map<string, PreparedSource>,
  descriptors: Map<D, string>,
): PreparedSource {
  const previous = ids.get(source.id);
  if (previous) {
    const old = sources.get(previous)!;
    if (
      old.descriptor !== source.descriptor ||
      old.path !== source.path ||
      old.extent !== source.extent ||
      old.mode !== source.mode ||
      old.width.mode !== source.width.mode ||
      (old.width.mode === "fixed" && source.width.mode === "fixed" && old.width.value !== source.width.value)
    )
      fail("VALUE", source.path, "Source identity must remain immutable and unique");
    return previous;
  }
  if (descriptors.has(source.descriptor)) fail("VALUE", source.path, "Descriptor identity must be unique");
  const prepared = Object.freeze({}) as PreparedSource;
  sources.set(prepared, source);
  ids.set(source.id, prepared);
  descriptors.set(source.descriptor, source.id);
  return prepared;
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
