import { render as coreRender, renderUnknown as coreRenderUnknown, type OperationOptions } from "@updf/core";
import { createLayoutOperation as coreOperation } from "@updf/core/internal";
import { lower as coreLower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { layout as contentLayout, measure as contentMeasure } from "@updf/layout";
import { createTextMeasurer, createTextService, type MeasureOptions, measureText as textMeasure } from "@updf/text";

// A single explicit test composition keeps lower/layout and final render on the same runtime.
const runtime = fontRuntime();
const defaults = {
  resources: { Helvetica: createHelvetica() },
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  providers: [fontProvider(runtime)],
};
export function textOptions<T extends OperationOptions>(options: T): T & OperationOptions {
  return { ...defaults, ...options, resources: { ...defaults.resources, ...options.resources } };
}
export const render: typeof coreRender = (input, options = {}) => coreRender(input, textOptions(options));
export const renderUnknown: typeof coreRenderUnknown = (input, options = {}) =>
  coreRenderUnknown(input, textOptions(options));
export const lower: typeof coreLower = (input, options = {}) => coreLower(input, textOptions(options));
export const layout: typeof contentLayout = (input, options = {}) => contentLayout(input, textOptions(options));
export const measure: typeof contentMeasure = (input, constraints, options = {}) =>
  contentMeasure(input, constraints, textOptions(options));
export function measurementOptions(options: Partial<MeasureOptions> = {}): MeasureOptions {
  return {
    measurer: createTextMeasurer({ runtime }),
    ...options,
    resources: { ...defaults.resources, ...options.resources },
  };
}
export const measureText = (input: Parameters<typeof textMeasure>[0], options: Partial<MeasureOptions> = {}) =>
  textMeasure(input, measurementOptions(options));
export const createLayoutOperation: typeof coreOperation = (options) => coreOperation(textOptions(options));
