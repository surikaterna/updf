import { DocumentError } from "@updf/core/internal";
import { exceeds, MetricSum, sum } from "./arithmetic.js";
import { type WorkLedger, work } from "./ledger.js";
import { type RunMetrics, richMetrics } from "./metrics.js";
import type { ResolvedTextResources as ResolvedFonts } from "./text-resources.js";
import type { ParagraphDefinition, TextLineMeasurement, TextStyle } from "./types.js";
import { effectiveStyle } from "./validate.js";

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
function collapsed(input: readonly Atom[]): readonly Atom[] {
  const result: Atom[] = [];
  let pending: Atom | undefined;
  for (const atom of input) {
    if (atom.text === " ") pending ??= atom;
    else {
      if (pending && result.length) result.push(pending);
      result.push(atom);
      pending = undefined;
    }
  }
  return result;
}
function tokens(input: readonly Atom[]): readonly (readonly Atom[])[] {
  const result: Atom[][] = [];
  for (const atom of input) {
    const last = result.at(-1);
    if (last && !last[0]?.atomic && !atom.atomic && (last[0]?.text === " ") === (atom.text === " ")) last.push(atom);
    else result.push([atom]);
  }
  return result;
}
export function advance(input: readonly Atom[]): number {
  const total = new MetricSum();
  for (const atom of input) total.add(atom.metrics.advance);
  return total.value;
}
function chunks(token: readonly Atom[], width: number, split: boolean): readonly (readonly Atom[])[] {
  if (!exceeds(advance(token), width)) return [token];
  const path = token[0]?.path ?? "";
  if (!split || token[0]?.atomic) overflow(token[0], path, "A token exceeds rich text width");
  const result: Atom[][] = [];
  let current: Atom[] = [];
  let currentAdvance = new MetricSum();
  for (const atom of token) {
    const atomAdvance = atom.metrics.advance;
    if (exceeds(atomAdvance, width)) overflow(atom, atom.path, "A Unicode scalar exceeds rich text width");
    if (exceeds(sum([currentAdvance.value, atomAdvance]), width)) {
      result.push(current);
      current = [];
      currentAdvance = new MetricSum();
    }
    current.push(atom);
    currentAdvance.add(atomAdvance);
  }
  if (current.length) result.push(current);
  return result;
}
function overflow(atom: Atom | undefined, path: string, message: string): never {
  throw new DocumentError("TOKEN_OVERFLOW", path, message, atom ? { span: { start: atom.start, end: atom.end } } : {});
}
function softWrap(
  input: readonly Atom[],
  width: number,
  paragraph: ParagraphDefinition,
  budget: WorkLedger,
  path: string,
): Atom[][] {
  const collapse = paragraph.whiteSpace === "collapse";
  const result: Atom[][] = [];
  let current: Atom[] = [];
  let currentAdvance = new MetricSum();
  let pending: readonly Atom[] = [];
  for (const token of tokens(collapse ? collapsed(input) : input)) {
    if (collapse && token[0]?.text === " ") {
      pending = token;
      continue;
    }
    for (const chunk of chunks(token, width, paragraph.breakLongWords === "codePoint")) {
      if (current.length && exceeds(sum([currentAdvance.value, advance(pending), advance(chunk)]), width)) {
        work(budget, 1, path);
        result.push(current);
        current = [];
        currentAdvance = new MetricSum();
        pending = [];
      }
      if (current.length) append(current, pending, currentAdvance);
      append(current, chunk, currentAdvance);
      pending = [];
    }
  }
  work(budget, 1, path);
  result.push(current);
  return result;
}
function append(target: Atom[], items: readonly Atom[], total: MetricSum): void {
  // Accumulate scalars in source order, not rounded token totals, so run/token
  // segmentation cannot change the compensated prefix used for fit checks.
  for (const item of items) {
    target.push(item);
    total.add(item.metrics.advance);
  }
}
export function wrap(
  input: readonly Atom[],
  width: number,
  paragraph: ParagraphDefinition,
  budget: WorkLedger,
  path: string,
): readonly WrappedLine[] {
  const result: WrappedLine[] = [];
  let hard: Atom[] = [];
  const flush = (reason: "hard" | "paragraphEnd") => {
    const lines = softWrap(hard, width, paragraph, budget, path);
    lines.forEach((line, i) => {
      result.push({ atoms: line, breakReason: i === lines.length - 1 ? reason : "soft" });
    });
    hard = [];
  };
  for (const atom of input) {
    if (atom.text === "\n") flush("hard");
    else hard.push(atom);
  }
  flush("paragraphEnd");
  return result;
}
