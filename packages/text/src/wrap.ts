import { MetricSum } from "./arithmetic.js";
import type { WorkLedger } from "./ledger.js";
import { type RunMetrics, richMetrics } from "./metrics.js";
import type { ResolvedTextResources as ResolvedFonts } from "./text-resources.js";
import type { ParagraphDefinition, TextLineMeasurement, TextStyle } from "./types.js";
import { effectiveStyle } from "./validate.js";
import { lineSelector } from "./wrap-selector.js";

export interface Atom {
  readonly atomic?: boolean;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly runIndex: number;
  readonly style: TextStyle;
  readonly metrics: RunMetrics;
  readonly path: string;
}
export interface WrappedLine {
  readonly atoms: readonly Atom[];
  readonly breakReason: TextLineMeasurement["breakReason"];
}
export function atoms(paragraph: ParagraphDefinition, fonts: ResolvedFonts, path: string): readonly Atom[] {
  const result: Atom[] = [];
  paragraph.runs.forEach((run, runIndex) => {
    const style = effectiveStyle(paragraph.defaultStyle, run.style);
    const at = `${path}/runs/${runIndex}/text`;
    let start = 0;
    for (const text of run.text) {
      result.push({
        text,
        start,
        end: start + text.length,
        runIndex,
        style,
        path: at,
        metrics: richMetrics(text === "\n" ? "" : text, style, fonts, at),
      });
      start += text.length;
    }
  });
  return result;
}
export function advance(input: readonly Atom[]): number {
  const total = new MetricSum();
  for (const atom of input) total.add(atom.metrics.advance);
  return total.value;
}
export function wrap(
  input: readonly Atom[],
  width: number,
  paragraph: ParagraphDefinition,
  budget: WorkLedger,
  path: string,
): readonly WrappedLine[] {
  const result: WrappedLine[] = [];
  const selector = lineSelector(input, paragraph, budget, path);
  for (;;) {
    const selected = selector.next(width);
    if (!selected) return result;
    if ("blocked" in selected) throw selected.blocked;
    result.push(selected);
  }
}
