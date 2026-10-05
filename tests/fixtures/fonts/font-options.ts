import type { OperationOptions } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextService } from "@updf/text";

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
