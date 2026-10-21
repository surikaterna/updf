import { fail } from "./error.js";
import { providerSnapshot, RangeState } from "./fragment-range.js";
import type { FragmentLimits, FragmentProvider, RangeOperation } from "./fragment-types.js";
import { FragmentWork } from "./fragment-work.js";

/** Host bridge only: distinct guarded operations share cumulative work and failure ownership. */
export function sharedRangeOperations<D, C>(provider: FragmentProvider<D, C>, limits?: FragmentLimits) {
  let snapshot: FragmentProvider<D, C> | undefined = providerSnapshot(provider);
  const work = new FragmentWork(limits);
  const states = new Set<RangeState<D, C>>();
  let active = true;
  const lifetime = {
    health() {
      if (!active) fail("VALUE", "/operation", "Fragment operation is closed");
    },
    poison() {
      if (!active) return;
      active = false;
      snapshot = undefined;
      for (const state of states) state.poison();
      states.clear();
    },
  };
  return (): RangeOperation<D, C> => {
    lifetime.health();
    const state = new RangeState(snapshot, work, lifetime);
    states.add(state);
    return Object.freeze({
      prepare: state.prepare,
      select: state.select,
      counts: () => work.counts(),
      close: lifetime.poison,
    });
  };
}
