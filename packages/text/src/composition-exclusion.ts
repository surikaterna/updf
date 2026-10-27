import { fail, finite } from "@updf/core/internal";
import type { TextServiceContext } from "@updf/core/resources";
import { exceeds, MetricSum } from "./arithmetic.js";
import { selectionBand } from "./composition-band.js";
import type { CompositionInput } from "./composition-types.js";
import { type Exclusion, interval, jump, validateExcludedLine, type SelectionBand } from "./exclusion.js";
import { line, type PrivateFragment } from "./lines.js";
import type { RichMeasurementPlan } from "./measure.js";
import type { ResolvedTextResources } from "./text-resources.js";
import type { ParagraphDefinition, TextLineMeasurement } from "./types.js";
import { atoms } from "./wrap.js";
import { lineSelector } from "./wrap-selector.js";
import { selectProfileLine } from "./composition-profile.js";
import { type ProfileExclusion, validateProfileLine } from "./profile-exclusion.js";

type Charge = (amount: number, path: string) => void;
function positionedHeight(height: MetricSum, top: number): MetricSum {
  if (top === height.value) return height;
  const result = new MetricSum();
  result.add(top);
  return result;
}
function selectLine(
  selector: ReturnType<typeof lineSelector>,
  top: number,
  input: CompositionInput,
  rect: Exclusion,
  band: SelectionBand,
  path: string,
  charge: Charge,
) {
  charge(1, path);
  let region = interval(rect, input.width, top, band, path);
  charge(1, path);
  let selected = region.width > 0 ? selector.next(region.width) : null;
  if (selected === null || (selected && "blocked" in selected && region.active)) {
    top = jump(rect, top, typeof band === "function" ? band(0)[0] : band[0], path);
    charge(1, path);
    region = interval(rect, input.width, top, band, path);
    if (region.active) fail("GEOMETRY", path, "Rounded reservation jump remains blocked");
    charge(1, path);
    selected = selector.next(region.width);
  }
  if (!selected) fail("GEOMETRY", path, "Expected an unconsumed line");
  if ("blocked" in selected) throw selected.blocked;
  return { selected, region, top };
}
function excludedSource(paragraph: ParagraphDefinition, fonts: ResolvedTextResources, path: string, charge: Charge) {
  charge(paragraph.runs.length, path);
  charge(paragraph.runs.reduce((n, run) => n + run.text.length, 0) + 1, path);
  const source = atoms(paragraph, fonts, path);
  charge(source.length + 1, path);
  return source;
}
function paragraphLines(
  paragraph: ParagraphDefinition,
  index: number,
  height: MetricSum,
  input: CompositionInput,
  rect: Exclusion | ProfileExclusion,
  fonts: ResolvedTextResources,
  context: TextServiceContext,
  path: string,
  charge: Charge,
) {
  const source = excludedSource(paragraph, fonts, path, charge);
  const band = selectionBand(source, paragraph, fonts, path);
  const selector = lineSelector(source, paragraph, context.budget, path, (amount) => charge(amount, path));
  const lines: TextLineMeasurement[] = [];
  const fragments: PrivateFragment[] = [];
  for (;;) {
    charge(1, path);
    if (selector.done) break;
    const choice =
      rect.shape === "edge-profile"
        ? selectProfileLine(selector, height, paragraph.lineHeight, input, rect, band, path, charge)
        : selectLine(selector, height.value, input, rect, band, path, charge);
    height = positionedHeight(height, choice.top);
    charge(choice.selected.atoms.length + 1, path);
    const measured = line(
      choice.selected,
      paragraph,
      index,
      choice.top,
      choice.region.width,
      fonts,
      context.budget,
      path,
      false,
      undefined,
      choice.region.origin,
    );
    if (rect.shape === "edge-profile") validateProfileLine(measured.publicLine, rect, input.width, path, charge);
    else validateExcludedLine(measured.publicLine, rect, input.width, path);
    if (finite(height.add(measured.publicLine.height), path) <= choice.top)
      fail("GEOMETRY", path, "Line cannot make strict progress");
    lines.push(measured.publicLine);
    for (const fragment of measured.fragments) fragments.push(fragment);
  }
  return { height, lines, fragments };
}
export function composeExcluded(
  input: CompositionInput,
  rect: Exclusion | ProfileExclusion,
  fonts: ResolvedTextResources,
  context: TextServiceContext,
  path: string,
  charge: Charge,
): RichMeasurementPlan {
  const lines: TextLineMeasurement[] = [],
    fragments: PrivateFragment[] = [];
  let height = new MetricSum();
  input.paragraphs.forEach((paragraph, index) => {
    const result = paragraphLines(
      paragraph,
      index,
      height,
      input,
      rect,
      fonts,
      context,
      `${path}/paragraphs/${index}`,
      charge,
    );
    height = result.height;
    for (const line of result.lines) lines.push(line);
    for (const fragment of result.fragments) fragments.push(fragment);
  });
  if (exceeds(height.value, input.maxHeight)) fail("VERTICAL_OVERFLOW", `${path}/height`, "Text exceeds height");
  return {
    result: Object.freeze({
      width: input.width,
      consumedHeight: height.value,
      lineCount: lines.length,
      lines: Object.freeze(lines),
    }),
    fragments,
  };
}
