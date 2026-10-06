import { ownDataValue, validateDataObject } from "@updf/core/internal";
import type { TextMeasurer, TextRuntime, TextServiceContext } from "@updf/core/resources";
import { measureInput } from "./measure.js";
import { ownRuntime, resolved } from "./text-resources.js";

export interface TextMeasurerOptions {
  readonly runtime: TextRuntime;
}
/** Shared measurement closure: both factories capture the same complete runtime contract. */
export function measurementClosure(value: unknown, defaultFont?: string) {
  const runtime = ownRuntime(value);
  const fonts = (context: TextServiceContext) => resolved(context, runtime, defaultFont);
  const measure: TextMeasurer["measure"] = (input, context, path) =>
    measureInput(input, fonts(context), context.budget, path);
  return { fonts, measure };
}
/** Create a standalone measurer without installing a default font or painting capabilities. */
export function createTextMeasurer(options: TextMeasurerOptions): TextMeasurer {
  validateDataObject(options, ["runtime"], "/text");
  return Object.freeze({ measure: measurementClosure(ownDataValue(options, "runtime", "/text/runtime")).measure });
}
