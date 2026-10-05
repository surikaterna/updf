import type { OperationOptions } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";

const runtime = fontRuntime();
export function cmrTextOptions(options: OperationOptions = {}): OperationOptions {
  return {
    ...options,
    resources: { Helvetica: createHelvetica(), ...options.resources },
    text: options.text ?? createTextService({ runtime, defaultFont: "Helvetica" }),
    providers: options.providers ?? [fontProvider(runtime)],
  };
}
