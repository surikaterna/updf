import type { OperationOptions } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, type MeasureOptions } from "@updf/text";

/** Tests explicitly opt into the historical bootstrap font, never a core fallback. */
export function fontOptions(options: OperationOptions = {}): OperationOptions {
  const runtime = fontRuntime();
  return {
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: [fontProvider(runtime)],
  };
}
export function fontMeasurementOptions(options: Partial<MeasureOptions> = {}): MeasureOptions {
  return {
    measurer: createTextMeasurer({ runtime: fontRuntime(), defaultFont: "Helvetica" }),
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
  };
}
