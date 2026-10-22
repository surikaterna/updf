import {
  array,
  finite,
  validateDataObject,
  validateMeasurement,
  validateTextFragments,
  ownTextOutput,
  snapshotData,
  number,
  checkLimit,
  fail,
  type CapabilityScope,
} from "@updf/core/internal";
import type { CompositionInput, CompositionPlan } from "./composition-types.js";
import { exceeds } from "./arithmetic.js";

/** Optional feature accounting, sharing the real operation policy without a second ledger. */
export function compositionCapture(scope: CapabilityScope) {
  let used = 0;
  const charge = (path: string): void => {
    used = checkLimit(used + 1, scope.budget.policy.nodes, path, "Composition work");
  };
  const visitor =
    (path: string) =>
    (item: unknown): void => {
      charge(path);
      if (typeof item === "string") for (const _scalar of item) charge(path);
    };
  return {
    input(input: CompositionInput, path: string): CompositionInput {
      charge(path);
      const result = snapshotData(input, path, undefined, visitor(path));
      validateDataObject(result, ["width", "maxHeight", "paragraphs"], path);
      number(result.width, `${path}/width`, true);
      number(result.maxHeight, `${path}/maxHeight`);
      return result;
    },
    output(plan: CompositionPlan, input: CompositionInput, path: string): CompositionPlan {
      const result = ownTextOutput(plan, path, visitor(path));
      validateComposition(result, path);
      validateFrame(input, result, path);
      return result;
    },
  };
}
function validateComposition(value: unknown, path: string): void {
  validateDataObject(value, ["measurement", "bands", "fragments"], path);
  validateMeasurement(value.measurement, `${path}/measurement`);
  validateTextFragments(value.fragments, `${path}/fragments`, true);
  array(value.bands, Number.MAX_SAFE_INTEGER, `${path}/bands`);
  value.bands.forEach((band, i) => {
    const at = `${path}/bands/${i}`;
    validateDataObject(band, ["top", "bottom", "baseline"], at);
    const top = finite(band.top, `${at}/top`);
    const bottom = finite(band.bottom, `${at}/bottom`);
    finite(band.baseline, `${at}/baseline`);
    if (top > bottom) fail("GEOMETRY", at, "Inverted occupied text band");
  });
}
function validateFrame(input: CompositionInput, plan: CompositionPlan, path: string): void {
  if (plan.measurement.width !== input.width) fail("GEOMETRY", path, "Composition width must match exactly");
  const height = plan.measurement.consumedHeight;
  if (exceeds(height, input.maxHeight)) fail("VERTICAL_OVERFLOW", path, "Composition exceeds maxHeight");
  if (plan.bands.length !== plan.measurement.lineCount) fail("GEOMETRY", path, "Expected one band per line");
  plan.bands.forEach((band, i) => {
    const line = plan.measurement.lines[i];
    const scale = Math.max(Math.abs(line?.top ?? 0), Math.abs(line?.baseline ?? 0), line?.height ?? 0);
    if (exceeds(-band.top, 0, scale) || exceeds(band.bottom, height))
      fail("FONT_INK", path, "Occupied band exceeds composed frame");
  });
  for (const fragment of plan.fragments) {
    const ink = fragment.inkBounds;
    if (
      !ink.empty &&
      (exceeds(-ink.left, 0, Math.max(Math.abs(fragment.x), fragment.advance, fragment.style.fontSize)) ||
        exceeds(ink.right, input.width) ||
        exceeds(-ink.top, 0, Math.max(Math.abs(fragment.baseline), fragment.style.fontSize)) ||
        exceeds(ink.bottom, height))
    )
      fail("FONT_INK", path, "Selected text ink exceeds composed frame");
  }
}
