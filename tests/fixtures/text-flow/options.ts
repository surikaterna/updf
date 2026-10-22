import type { OperationOptions } from "@updf/core";
import { createLayoutOperation as coreOperation } from "@updf/core/internal";
import { useOperationCapability } from "@updf/core/resources";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { createTextComposition, type CompositionPlan, type CompositionInput } from "@updf/text/composition";
import { compositionCapability } from "../../../packages/text/src/composition-operation.js";
import { composeRectangular } from "../../../packages/text/src/composition-plan.js";
import { serviceClosure } from "../../../packages/text/src/service.js";

const runtime = fontRuntime();
export const installation = createTextComposition({ runtime, defaultFont: "Helvetica" });
export type OutputChange = (plan: CompositionPlan, input: CompositionInput) => unknown;

export function compositionOptions(resources: OperationOptions["resources"] = {}, change?: OutputChange) {
  if (!change)
    return {
      resources: { Helvetica: createHelvetica(), ...resources },
      ...installation,
      providers: [fontProvider(runtime)],
    };
  const { service, fonts } = serviceClosure({ runtime, defaultFont: "Helvetica" });
  // The adversarial source callback shares the emitted ABI, but its private TS brand is distinct.
  const capability = compositionCapability(
    (input, context, path) =>
      change(composeRectangular(input, fonts(context), context, path), input) as CompositionPlan,
  ) as unknown as typeof installation.capability;
  return {
    resources: { Helvetica: createHelvetica(), ...resources },
    text: service,
    capability,
    providers: [fontProvider(runtime)],
  };
}
/** Test convenience only: production contexts expose no composition methods. */
export function createLayoutOperation(options: OperationOptions & { capability: typeof installation.capability }) {
  const operation = coreOperation(options);
  return { ...operation, ...useOperationCapability(operation, options.capability) };
}
