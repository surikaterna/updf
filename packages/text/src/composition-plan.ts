import { fail, number, validateDataObject } from "@updf/core/internal";
import type { TextServiceContext } from "@updf/core/resources";
import type { CompositionInput, CompositionPlan } from "./composition-types.js";
import { exceeds } from "./arithmetic.js";
import { rich } from "./measure.js";
import type { ResolvedTextResources } from "./text-resources.js";
import { validateInput } from "./validate.js";
import { exclusion } from "./exclusion.js";
import { composeExcluded } from "./composition-exclusion.js";
import { profileExclusion } from "./profile-exclusion.js";

export function composeRectangular(
  input: CompositionInput,
  fonts: ResolvedTextResources,
  context: TextServiceContext,
  path: string,
  charge?: (amount: number, path: string) => void,
): CompositionPlan {
  validateDataObject(input, ["width", "maxHeight", "paragraphs", "exclusion"], path);
  number(input.maxHeight, `${path}/maxHeight`);
  const rectangular = { width: input.width, height: input.maxHeight, paragraphs: input.paragraphs };
  validateInput(rectangular, fonts, context.budget, path);
  input.paragraphs.forEach((paragraph, i) => {
    if (paragraph.align !== "left")
      fail("VALUE", `${path}/paragraphs/${i}/align`, "Composition supports left alignment only");
  });
  const rect =
    input.exclusion === undefined
      ? undefined
      : input.exclusion.shape === "edge-profile"
        ? profileExclusion(input.exclusion, input.width, `${path}/exclusion`, charge)
        : exclusion(input.exclusion, input.width, `${path}/exclusion`);
  if (rect && !charge) fail("MEASUREMENT_CONTEXT", path, "Exclusion requires composition accounting");
  const plan =
    rect && charge
      ? composeExcluded(input, rect, fonts, context, path, charge)
      : rich(rectangular, fonts, context.budget, path);
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
