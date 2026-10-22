import { compositionCapability } from "./composition-operation.js";
import { composeRectangular } from "./composition-plan.js";
import { serviceClosure, type TextServiceOptions } from "./service.js";

export type { CompositionInput, CompositionPlan, ComposedTextFrame, OccupiedTextBand } from "./composition-types.js";
export type { TextCompositionOperation } from "./composition-operation.js";
export type { TextServiceOptions } from "./service.js";

/** One service closure; the selected capability resolves against the operation's real bindings and budget. */
export function createTextComposition(options: TextServiceOptions) {
  const { service, fonts } = serviceClosure(options);
  return Object.freeze({
    text: service,
    capability: compositionCapability((input, context, path) =>
      composeRectangular(input, fonts(context), context, path),
    ),
  });
}
