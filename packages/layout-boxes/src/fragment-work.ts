import { fail } from "./error.js";
import type { FragmentCounts, FragmentLimits, ProviderWork } from "./fragment-types.js";
import { record, trackLimit } from "./width-validation.js";

/** Frozen cumulative caps: 10000 attempts, 100000 visits/reads/measurements/units/output, 1000000 provider units. */
export const fragmentDefaults: FragmentCounts = Object.freeze({
  attempts: 10000,
  sourceVisits: 100000,
  sourceReads: 100000,
  measurements: 100000,
  unitsExamined: 100000,
  outputFragments: 100000,
  providerUnits: 1000000,
});
type Category = keyof FragmentCounts;
export class FragmentWork {
  private readonly totals = Object.fromEntries(Object.keys(fragmentDefaults).map((key) => [key, 0])) as Record<
    Category,
    number
  >;
  private readonly limits: FragmentCounts;
  constructor(input: FragmentLimits = {}) {
    const data = record(input, Object.keys(fragmentDefaults), "/limits");
    const limits = { ...fragmentDefaults };
    for (const key of Object.keys(data) as Category[]) {
      const value = data[key];
      if (typeof value !== "number") fail("TYPE", `/limits/${key}`, "Expected work limit");
      trackLimit(value, `/limits/${key}`);
      limits[key] = value;
    }
    this.limits = Object.freeze(limits);
  }
  charge(key: Category, amount = 1): void {
    trackLimit(amount, `/work/${key}`);
    this.capacity(key, amount);
    this.totals[key] += amount;
  }
  capacity(key: Category, amount: number): void {
    if (amount > this.limits[key] - this.totals[key]) fail("LIMIT", `/work/${key}`, "Fragment work limit exceeded");
  }
  counts(): FragmentCounts {
    return Object.freeze({ ...this.totals });
  }
  callback<T>(invoke: (work: ProviderWork) => T, poison: () => void, health: () => void): T {
    const lease: WorkLease = { ledger: this, poison, health };
    const work = workHandle(lease);
    try {
      const result = invoke(work);
      health();
      return result;
    } finally {
      lease.ledger = undefined;
      lease.health = undefined;
    }
  }
}
interface WorkLease {
  ledger: FragmentWork | undefined;
  poison: (() => void) | undefined;
  health: (() => void) | undefined;
}
function workHandle(lease: WorkLease): ProviderWork {
  return Object.freeze({
    consume: (units: number): void => {
      try {
        if (!lease.ledger) fail("VALUE", "/work", "Provider work handle has expired");
        lease.health!();
        lease.ledger.charge("providerUnits", units);
      } catch (error) {
        lease.poison?.();
        throw error;
      }
    },
  });
}
