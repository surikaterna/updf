import { resolveResources } from "../fonts/resources.js";
import { ledger } from "../measurement/ledger.js";
import type { OperationOptions } from "./policy.js";
import { policy } from "./policy.js";

/** Validate options first, then snapshot each resource binding once into an owned Map. */
export function operation(options: OperationOptions, additional: readonly string[] = [], logicalText = true) {
  const limits = policy(options, additional);
  const fonts = resolveResources("resources" in options ? { resources: options.resources } : {}, limits);
  return { fonts, budget: ledger(limits, logicalText) };
}
