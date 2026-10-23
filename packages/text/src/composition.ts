import { compositionCapability } from "./composition-operation.js";
import { composeRectangular } from "./composition-plan.js";
import { serviceClosure, type TextServiceOptions } from "./service.js";
import { inlineSelection } from "./inline-selection.js";
export { profileDepth as conservativeSegmentDepth } from "./profile-interpolation.js";

export type {
  CompositionInput,
  CompositionPlan,
  ComposedTextFrame,
  OccupiedTextBand,
  RectangularExclusion,
  EdgeProfilePoint,
  EdgeProfileExclusion,
  TextExclusion,
} from "./composition-types.js";
export type { TextCompositionOperation } from "./composition-operation.js";
export type {
  InlineContinuation,
  InlineSelection,
  SelectedInlineLine,
  InlineSelectionOperation,
} from "./inline-selection-types.js";
export type { TextServiceOptions } from "./service.js";

/** One service closure; the selected capability resolves against the operation's real bindings and budget. */
export function createTextComposition(options: TextServiceOptions) {
  const { service, fonts } = serviceClosure(options);
  return Object.freeze({
    text: service,
    capability: compositionCapability(
      (input, context, path, charge) => composeRectangular(input, fonts(context), context, path, charge),
      (scope, charge) => inlineSelection(scope, fonts, charge),
    ),
  });
}
