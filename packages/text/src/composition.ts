import { fail, number, validateDataObject } from "@updf/core/internal";
import type { CompositionInput, CompositionPlan, TextService, TextServiceContext } from "@updf/core/resources";
import { exceeds } from "./arithmetic.js";
import { rich } from "./measure.js";
import { serviceClosure, type TextServiceOptions } from "./service.js";
import type { ResolvedTextResources } from "./text-resources.js";
import { validateInput } from "./validate.js";

export type { CompositionInput, CompositionPlan, ComposedTextFrame, OccupiedTextBand } from "@updf/core/resources";
export type { TextServiceOptions } from "./service.js";

function compose(
  input: CompositionInput,
  fonts: ResolvedTextResources,
  context: TextServiceContext,
  path: string,
): CompositionPlan {
  validateDataObject(input, ["width", "maxHeight", "paragraphs"], path);
  number(input.maxHeight, `${path}/maxHeight`);
  const rectangular = { width: input.width, height: input.maxHeight, paragraphs: input.paragraphs };
  validateInput(rectangular, fonts, context.budget, path);
  input.paragraphs.forEach((paragraph, i) => {
    if (paragraph.align !== "left")
      fail("VALUE", `${path}/paragraphs/${i}/align`, "Composition supports left alignment only");
  });
  const plan = rich(rectangular, fonts, context.budget, path);
  // The selected font envelope is contained by the existing fixed-height line owner.
  // Direct fragment painting consumes that baseline, not a newly measured native box.
  const bands = plan.result.lines.map((line) => {
    const top = line.inkBounds.empty ? line.top : Math.min(line.top, line.inkBounds.top);
    const bottom = line.inkBounds.empty
      ? line.top + line.height
      : Math.max(line.top + line.height, line.inkBounds.bottom);
    if (exceeds(-top, 0, line.height) || exceeds(bottom, plan.result.consumedHeight))
      fail("FONT_INK", path, "Occupied text band exceeds composed frame");
    return Object.freeze({ top, bottom, baseline: line.baseline });
  });
  return { measurement: plan.result, bands, fragments: plan.fragments };
}
/** Opt in to rectangular composition without changing ordinary text's import graph. */
export function createCompositionTextService(options: TextServiceOptions): TextService {
  const { service, fonts } = serviceClosure(options);
  return Object.freeze({
    ...service,
    compose: (input, context, path) => compose(input, fonts(context), context, path),
  } satisfies TextService);
}
