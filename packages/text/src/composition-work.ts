import { checkLimit, type CapabilityScope } from "@updf/core/internal";

/** One counter per operation, shared by composition and inline selection when combined. */
export function compositionWork(scope: CapabilityScope) {
  let used = 0;
  return (amount: number, path: string): void => {
    used = checkLimit(used + amount, scope.budget.policy.nodes, path, "Composition work");
  };
}
