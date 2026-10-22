import type { OperationOptions } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createCompositionTextService } from "@updf/text/composition";

export function compositionOptions(resources: OperationOptions["resources"] = {}): OperationOptions {
  const runtime = fontRuntime();
  return {
    resources: { Helvetica: createHelvetica(), ...resources },
    text: createCompositionTextService({ runtime, defaultFont: "Helvetica" }),
    providers: [fontProvider(runtime)],
  };
}
