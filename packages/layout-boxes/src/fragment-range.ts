import { fail } from "./error.js";
import { selectRange } from "./fragment-select.js";
import { selectionRequest, sourceSnapshot } from "./fragment-source.js";
import type {
  FragmentLimits,
  FragmentProvider,
  FragmentSource,
  PreparedSource,
  RangeOperation,
  SelectionRequest,
} from "./fragment-types.js";
import { FragmentWork } from "./fragment-work.js";
import { record } from "./width-validation.js";

export function providerSnapshot<D, C>(input: FragmentProvider<D, C>): FragmentProvider<D, C> {
  const data = record(input, ["next"], "/provider");
  if (typeof data.next !== "function") fail("TYPE", "/provider/next", "Expected provider callback");
  return Object.freeze({ next: data.next }) as FragmentProvider<D, C>;
}

/** Range selection without retaining candidate-enumeration or indexed-region machinery. */
export function createRangeOperation<D, C>(
  provider: FragmentProvider<D, C>,
  limits?: FragmentLimits,
): RangeOperation<D, C> {
  const state = new RangeState(providerSnapshot(provider), new FragmentWork(limits));
  return Object.freeze({
    prepare: state.prepare,
    select: state.select,
    counts: () => state.work.counts(),
    close: state.poison,
  });
}

/** Optional capabilities extend this same source, ledger, guard and poisoning authority. */
export class RangeState<D, C> {
  private sources = new WeakMap<PreparedSource, FragmentSource<D>>();
  private readonly ids = new Map<string, PreparedSource>();
  private readonly descriptors = new Map<D, string>();
  private active = true;
  private running = false;
  constructor(
    protected provider: FragmentProvider<D, C> | undefined,
    readonly work: FragmentWork,
    private readonly lifetime?: { health(): void; poison(): void },
  ) {}
  poison = (): void => {
    this.active = false;
    this.provider = undefined;
    this.ids.clear();
    this.descriptors.clear();
    this.sources = new WeakMap();
    this.releaseCapabilities();
    this.lifetime?.poison();
  };
  protected releaseCapabilities(): void {
    // The full operation releases its optional stores through this same poison path.
  }
  protected health = (): void => {
    if (!this.active) fail("VALUE", "/operation", "Fragment operation is closed");
    this.lifetime?.health();
  };
  protected guard<T>(run: () => T): T {
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
  protected source(prepared: PreparedSource): FragmentSource<D> {
    const source = this.sources.get(prepared);
    if (!source) fail("VALUE", "/source", "Foreign prepared source");
    return source;
  }
  protected register(input: FragmentSource<D>): PreparedSource {
    return registerSource(sourceSnapshot(input), this.sources, this.ids, this.descriptors);
  }
  prepare = (input: FragmentSource<D>): PreparedSource =>
    this.guard(() => {
      this.work.charge("sourceReads");
      return this.register(input);
    });
  select = (prepared: PreparedSource, input: SelectionRequest) =>
    this.guard(() => {
      this.work.charge("attempts");
      this.work.charge("sourceVisits");
      return selectRange(
        this.source(prepared),
        selectionRequest(input),
        this.provider!,
        this.work,
        this.poison,
        this.health,
      );
    });
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
