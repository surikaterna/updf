import { fail } from "../core/error.js";
import { bindLayoutContext, layoutOperation } from "../core/layout-operation.js";
import { bindOperationCapabilityContext } from "../core/operation-capability.js";
import { textService } from "../core/text-resources.js";
import type { TextMeasurementInput } from "../measurement/types.js";
import type { State } from "./state.js";
import type { ComponentContext } from "./types.js";

export function measurementContext(state: State, path: string): ComponentContext {
  const measurement = Object.freeze({
    measureText: (input: TextMeasurementInput) => {
      if (state.closed) fail("MEASUREMENT_CONTEXT", `${path}/measurement`, "Lowering operation has closed");
      return textService(state.fonts, "/measurement").measure(
        input,
        { bindings: state.fonts.bindings, budget: state.budget },
        "/measurement",
      );
    },
  });
  const context = Object.freeze({ resources: state.context.resources, measurement });
  const operation = layoutOperation(state.fonts, state.budget, () => !state.closed, state);
  bindLayoutContext(context, operation);
  if (state.fonts.capability)
    bindOperationCapabilityContext(
      context,
      operation,
      { path },
      {
        get active() {
          return !state.closed;
        },
      },
    );
  return context;
}
