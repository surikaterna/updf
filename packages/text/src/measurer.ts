import { dataRecord, fail, ownDataValue } from "@updf/core/internal";
import type { TextMeasurer, TextRuntime, TextServiceContext } from "@updf/core/resources";
import { measureInput } from "./measure.js";
import { ownRuntime, resolved } from "./text-resources.js";

export interface TextMeasurerOptions {
  readonly runtime: TextRuntime;
  readonly defaultFont?: string;
}
/** Shared measurement closure: both factories capture the same complete runtime contract. */
export function measurementClosure(options: TextMeasurerOptions) {
  dataRecord(options, "/text");
  const runtime = ownRuntime(ownDataValue(options, "runtime", "/text/runtime"));
  const defaultFont = ownDataValue(options, "defaultFont", "/text/defaultFont");
  if (defaultFont !== undefined && typeof defaultFont !== "string")
    fail("TYPE", "/text/defaultFont", "Expected font id");
  const fonts = (context: TextServiceContext) => resolved(context, runtime, defaultFont);
  const measure: TextMeasurer["measure"] = (input, context, path) =>
    measureInput(input, fonts(context), context.budget, path);
  return { fonts, measure };
}
/** Create a standalone measurer without installing a default font or painting capabilities. */
export function createTextMeasurer(options: TextMeasurerOptions): TextMeasurer {
  return Object.freeze({ measure: measurementClosure(options).measure });
}
