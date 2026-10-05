import type { WorkLedger } from "../measurement/ledger.js";
import type { TextMeasurement, TextMeasurementInput } from "../measurement/types.js";
import { operation } from "./operation.js";
import type { OperationOptions } from "./policy.js";
import { type ResolvedTextResources, textService } from "./text-resources.js";

export function measureResolvedText(
  input: TextMeasurementInput,
  fonts: ResolvedTextResources,
  budget: WorkLedger,
  path: string,
): TextMeasurement {
  return textService(fonts, path).measure(input, { bindings: fonts.bindings, budget }, path);
}

/** Standalone measurement owns resources and a fresh budget, but no escaping layout state. */
export function measureStandaloneText(input: TextMeasurementInput, options: OperationOptions): TextMeasurement {
  const owned = operation(options);
  return measureResolvedText(input, owned.fonts, owned.budget, "");
}
