import { render as coreRender, type OperationOptions } from "@updf/core";
import { lower as coreLower } from "@updf/core/vdom";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";

const runtime = fontRuntime();
export function textOptions(options: OperationOptions = {}): OperationOptions {
  return {
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
    text: options.text ?? createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: options.providers ?? [fontProvider(runtime)],
  };
}
export const render: typeof coreRender = (input, options = {}) => coreRender(input, textOptions(options));
export const lower: typeof coreLower = (input, options = {}) => coreLower(input, textOptions(options));
