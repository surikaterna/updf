import { fail } from "../core/error.js";
import type { ResolvedFonts } from "../fonts/resources.js";
import { MetricSum, sum } from "./arithmetic.js";
import type { WorkLedger } from "./ledger.js";
import { type InlineLineHeights, inlineEnvelope, validateLineHeight } from "./line-height.js";
import { line } from "./lines.js";
import { type RunMetrics, richMetrics } from "./metrics.js";
import type { ParagraphDefinition, TextLineMeasurement } from "./types.js";
import { validateInput } from "./validate.js";
import { type Atom, atoms, wrap } from "./wrap.js";

export interface InlineMetric {
  readonly runIndex: number;
  readonly path: string;
  readonly metrics: RunMetrics;
}
export interface InlineLine {
  readonly line: TextLineMeasurement;
  readonly nativeTops: readonly number[];
  readonly nativeHeights: readonly number[];
  readonly nativeWidths: readonly number[];
  readonly nativePads: readonly number[];
}
/** Adapt atomic metrics at the token boundary, retaining the audited scalar wrapper. */
export function measureInline(
  paragraph: ParagraphDefinition,
  visuals: () => readonly InlineMetric[],
  width: number,
  autoHeight: boolean | InlineLineHeights,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  path: string,
): readonly InlineLine[] {
  if (typeof autoHeight !== "boolean") {
    validateLineHeight(autoHeight.strut, `${path}/lineHeight`);
    for (const [index, value] of (autoHeight.runs ?? []).entries())
      validateLineHeight(value, `${path}/runs/${index}/lineHeight`);
  }
  const validation = autoHeight
    ? {
        ...paragraph,
        lineHeight: paragraph.runs.reduce(
          (height, run) => Math.max(height, run.style?.fontSize ?? paragraph.defaultStyle.fontSize),
          paragraph.lineHeight,
        ),
      }
    : paragraph;
  validateInput({ kind: "rich", width, paragraphs: [validation] }, fonts, budget, path);
  const input = inlineAtoms(paragraph, visuals(), fonts, path);
  const result: InlineLine[] = [];
  const height = new MetricSum();
  for (const wrapped of wrap(input, width, paragraph, budget, path)) {
    const layout =
      typeof autoHeight === "boolean" ? undefined : inlineEnvelope(wrapped, paragraph, autoHeight, fonts, path);
    const measured = line(
      wrapped,
      paragraph,
      0,
      height.value,
      width,
      fonts,
      budget,
      path,
      !!autoHeight,
      layout,
    ).publicLine;
    height.add(measured.height);
    result.push(nativeLine(measured, width, fonts, path));
  }
  return Object.freeze(result);
}
function nativeLine(measured: TextLineMeasurement, width: number, fonts: ResolvedFonts, path: string): InlineLine {
  const nativeHeights: number[] = [];
  const nativeWidths: number[] = [],
    nativePads: number[] = [];
  const nativeTops = measured.fragments.map((fragment) => {
    const metrics = richMetrics(fragment.text, fragment.style, fonts, path);
    const nativeHeight = Math.max(fragment.style.fontSize, sum([metrics.ascent, metrics.descent]));
    nativeHeights.push(nativeHeight);
    const pad = Math.max(0, -metrics.left, metrics.right - fragment.advance);
    nativePads.push(pad);
    const nativeWidth = sum([fragment.advance, pad, pad]);
    nativeWidths.push(nativeWidth > 0 ? nativeWidth : width);
    return measured.baseline - metrics.ascent - (nativeHeight - sum([metrics.ascent, metrics.descent])) / 2;
  });
  return Object.freeze({
    line: measured,
    nativeTops: Object.freeze(nativeTops),
    nativeHeights: Object.freeze(nativeHeights),
    nativeWidths: Object.freeze(nativeWidths),
    nativePads: Object.freeze(nativePads),
  });
}
function inlineAtoms(
  paragraph: ParagraphDefinition,
  visuals: readonly InlineMetric[],
  fonts: ResolvedFonts,
  path: string,
): readonly Atom[] {
  const text = atoms(paragraph, fonts, `${path}/paragraphs/0`);
  const byRun = new Map(visuals.map((visual) => [visual.runIndex, visual]));
  const result: Atom[] = [];
  let cursor = 0;
  paragraph.runs.forEach((run, runIndex) => {
    const visual = byRun.get(runIndex);
    if (visual) {
      if (run.text !== "") fail("TYPE", visual.path, "Visual runs cannot contain text");
      result.push({
        text: "",
        start: 0,
        end: 0,
        runIndex,
        style: paragraph.defaultStyle,
        path: visual.path,
        metrics: visual.metrics,
        atomic: true,
      });
    }
    while (text[cursor]?.runIndex === runIndex) {
      const atom = text[cursor++];
      if (atom) result.push(atom);
    }
  });
  return result;
}
