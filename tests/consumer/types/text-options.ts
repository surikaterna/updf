import { render as coreRender, type OperationOptions } from "@updf/core";
import { lower as coreLower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";

const runtime = fontRuntime();
export function textOptions<T extends OperationOptions>(options: T): T & OperationOptions {
  return {
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: [fontProvider(runtime)],
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
  };
}
export const render: typeof coreRender = (input, options = {}) => coreRender(input, textOptions(options));
export const lower: typeof coreLower = (input, options = {}) => coreLower(input, textOptions(options));
