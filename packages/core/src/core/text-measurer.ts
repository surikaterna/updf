import type { TextMeasurement, TextMeasurementInput } from "../measurement/types.js";
import type { OwnedResource } from "./owned-resource.js";
import type { Limits } from "./policy.js";
import { validateDataObject } from "./schema.js";
import { captureTextCallback } from "./text-capture.js";
import { validateMeasurement } from "./text-measurement-output.js";
import type { TextServiceContext } from "./text-service.js";

/** Standalone measurement capability; no painting or layout callbacks are accepted. */
export interface TextMeasurer {
  measure(input: TextMeasurementInput, context: TextServiceContext, path: string): TextMeasurement;
}
export interface MeasureOptions {
  readonly resources?: Readonly<Record<string, OwnedResource>>;
  readonly measurer: TextMeasurer;
  readonly profile?: "trusted" | "service";
  readonly limits?: Limits;
}
export function ownTextMeasurer(value: unknown): TextMeasurer {
  const path = "/options/measurer";
  validateDataObject(value, ["measure"], path);
  return Object.freeze({ measure: captureTextCallback(value, "measure", path, validateMeasurement) }) as TextMeasurer;
}
