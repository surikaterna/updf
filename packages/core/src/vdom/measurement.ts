import { fail } from "../core/error.js";
import { bindLayoutContext, layoutOperation } from "../core/layout-operation.js";
import { measureInput } from "../measurement/measure.js";
import type { TextMeasurementInput } from "../measurement/types.js";
import type { State } from "./state.js";
import type { ComponentContext } from "./types.js";

export function measurementContext(state: State, path: string): ComponentContext {
  const measurement = Object.freeze({
    measureText: (input: TextMeasurementInput) => {
      if (state.closed) fail("MEASUREMENT_CONTEXT", `${path}/measurement`, "Lowering operation has closed");
      return measureInput(input, state.fonts, state.budget, "/measurement");
    },
  });
  const context = Object.freeze({ resources: state.context.resources, measurement });
  bindLayoutContext(
    context,
    layoutOperation(state.fonts, state.budget, () => !state.closed, state),
  );
  return context;
}
