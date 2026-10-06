import type { WorkLedger } from "../measurement/ledger.js";
import { ledger } from "../measurement/ledger.js";
import type { TextMeasurement, TextMeasurementInput } from "../measurement/types.js";
import { ownDataValue } from "./data.js";
import { policyWithKeys } from "./policy.js";
import { resolveBindings } from "./resource-bindings.js";
import { type MeasureOptions, ownTextMeasurer } from "./text-measurer.js";
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
export function measureStandaloneText(input: TextMeasurementInput, options: MeasureOptions): TextMeasurement {
  const limits = policyWithKeys(options, ["resources", "measurer", "profile", "limits"]);
  const bindings = resolveBindings(options, limits);
  const measurer = ownTextMeasurer(ownDataValue(options, "measurer", "/options/measurer"));
  return measurer.measure(input, { bindings, budget: ledger(limits) }, "");
}
