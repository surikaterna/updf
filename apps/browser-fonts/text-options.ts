import type { OperationOptions } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextMeasurer, createTextService, type MeasureOptions } from "@updf/text";

export function textOptions(options: OperationOptions = {}): OperationOptions {
  const runtime = fontRuntime();
  return {
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: [fontProvider(runtime)],
  };
}
export function measurementOptions(options: Partial<MeasureOptions> = {}): MeasureOptions {
  return {
    measurer: createTextMeasurer({ runtime: fontRuntime() }),
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
  };
}
