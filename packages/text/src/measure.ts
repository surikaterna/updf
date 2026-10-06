import { fail } from "@updf/core/internal";
import { exceeds, MetricSum } from "./arithmetic.js";
import type { WorkLedger } from "./ledger.js";
import { line, type PrivateFragment } from "./lines.js";
import type { ResolvedTextResources as ResolvedFonts } from "./text-resources.js";
import type { RichTextInput, TextLineMeasurement, TextMeasurement } from "./types.js";
import { validateInput } from "./validate.js";
import { atoms, wrap } from "./wrap.js";

export interface RichMeasurementPlan {
  readonly result: TextMeasurement;
  readonly fragments: readonly PrivateFragment[];
}
export function rich(
  input: RichTextInput,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  path: string,
): RichMeasurementPlan {
  const lines: TextLineMeasurement[] = [];
  const fragments: PrivateFragment[] = [];
  const height = new MetricSum();
  input.paragraphs.forEach((paragraph, i) => {
    const at = `${path}/paragraphs/${i}`;
    const wrapped = wrap(atoms(paragraph, fonts, at), input.width, paragraph, budget, at);
    for (const item of wrapped) {
      const measured = line(item, paragraph, i, height.value, input.width, fonts, budget, at);
      const top = height.add(paragraph.lineHeight);
      if (!Number.isFinite(top)) fail("GEOMETRY", at, "Rich text height must remain finite");
      lines.push(measured.publicLine);
      for (const fragment of measured.fragments) fragments.push(fragment);
    }
  });
  if (input.height !== undefined && exceeds(height.value, input.height))
    fail("VERTICAL_OVERFLOW", `${path}/height`, "Text exceeds height");
  const result = Object.freeze({
    width: input.width,
    consumedHeight: height.value,
    lineCount: lines.length,
    lines: Object.freeze(lines),
  });
  return { result, fragments };
}
export function measureInput(input: unknown, fonts: ResolvedFonts, budget: WorkLedger, path: string): TextMeasurement {
  validateInput(input, fonts, budget, path);
  return rich(input, fonts, budget, path).result;
}
