import { render as coreRender, renderUnknown as coreRenderUnknown, type OperationOptions } from "@updf/core";
import { createLayoutOperation as coreOperation } from "@updf/core/internal";
import { lower as coreLower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { layout as contentLayout, measure as contentMeasure } from "@updf/layout";
import { createTextService, measureText as textMeasure } from "@updf/text";
import {
  layoutTableFlow as tableFlow,
  layoutTableFlowUnknown as tableFlowUnknown,
  layoutTable as tableLayout,
  layoutTableUnknown as tableUnknown,
} from "../../packages/layout/dist/tables/index.js";

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
export const measureText = (input: Parameters<typeof textMeasure>[0], options: OperationOptions = {}) =>
  textMeasure(input, textOptions(options));
export const createLayoutOperation: typeof coreOperation = (options) => coreOperation(textOptions(options));
export const layoutTable: typeof tableLayout = (input, options = {}) => tableLayout(input, textOptions(options));
export const layoutTableUnknown: typeof tableUnknown = (input, options = {}) =>
  tableUnknown(input, textOptions(options));
export const layoutTableFlow: typeof tableFlow = (input, options = {}) => tableFlow(input, textOptions(options));
export const layoutTableFlowUnknown: typeof tableFlowUnknown = (input, options = {}) =>
  tableFlowUnknown(input, textOptions(options));
