import { fail } from "../core/error.js";
import { measureFixedText } from "../core/fixed-text.js";
import type { ResolvedFonts } from "../fonts/resources.js";
import { exceeds, MetricSum } from "./arithmetic.js";
import type { WorkLedger } from "./ledger.js";
import { line, type PrivateFragment } from "./lines.js";
import { ink, metrics } from "./metrics.js";
import type { PlainTextInput, RichTextInput, TextLineMeasurement, TextMeasurement } from "./types.js";
import { effectiveStyle, validateInput } from "./validate.js";
import { atoms, wrap } from "./wrap.js";

export interface RichMeasurementPlan {
  readonly result: TextMeasurement;
  readonly fragments: readonly PrivateFragment[];
}
function result(
  width: number,
  lines: readonly TextLineMeasurement[],
  height?: number,
  consumedHeight = lines.reduce((sum, line) => sum + line.height, 0),
): TextMeasurement {
  if (!Number.isFinite(consumedHeight)) fail("GEOMETRY", "/height", "Text height must remain finite");
  if (height !== undefined && consumedHeight > height) fail("VERTICAL_OVERFLOW", "/height", "Text exceeds height");
  return Object.freeze({ width, consumedHeight, lineCount: lines.length, lines: Object.freeze(lines) });
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
  return { result: result(input.width, lines, undefined, height.value), fragments };
}
function plain(input: PlainTextInput, fonts: ResolvedFonts, budget: WorkLedger, path: string): TextMeasurement {
  const props = {
    width: input.width,
    text: input.text,
    fontSize: input.fontSize,
    lineHeight: input.lineHeight,
    align: input.align,
    ...(input.font === undefined ? {} : { font: input.font }),
  };
  const measured = measureFixedText(
    { type: "text", x: 0, y: 0, ...props, height: input.height ?? Number.MAX_VALUE },
    path,
    fonts,
    budget,
  );
  const style = effectiveStyle({ font: input.font ?? "Helvetica", fontSize: input.fontSize, color: [0, 0, 0] });
  let paragraphIndex = 0;
  let offset = 0;
  const lines = measured.lines.map((item, i): TextLineMeasurement => {
    const run = metrics(item.text, style, fonts, `${path}/text`);
    const end = offset + item.text.length;
    const next = input.text[end];
    const bounds = ink(run, item.x, item.y);
    const fragment = Object.freeze({
      text: item.text,
      style,
      x: item.x,
      advance: run.advance,
      inkBounds: bounds,
      runIndex: 0,
      source: Object.freeze({ start: offset, end }),
    });
    const currentParagraph = paragraphIndex;
    if (next === "\n") paragraphIndex++;
    offset = end + (next === "\n" ? 1 : 0);
    return Object.freeze({
      paragraphIndex: currentParagraph,
      top: i * input.lineHeight,
      height: input.lineHeight,
      baseline: item.y,
      advance: run.advance,
      inkBounds: bounds,
      fragments: Object.freeze([fragment]),
      breakReason: next === "\n" ? "hard" : i === measured.lines.length - 1 ? "paragraphEnd" : "soft",
    });
  });
  return result(input.width, lines, input.height);
}
export function measureInput(input: unknown, fonts: ResolvedFonts, budget: WorkLedger, path: string): TextMeasurement {
  validateInput(input, fonts, budget, path);
  return input.kind === "rich" ? rich(input, fonts, budget, path).result : plain(input, fonts, budget, path);
}
