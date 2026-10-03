import { fail } from "../core/error.js";
import type { ResolvedFonts } from "../fonts/resources.js";
import type { PreparedFont, PreparedGlyph } from "../fonts/types.js";
import { exceeds, MetricSum, sum } from "./arithmetic.js";
import { type WorkLedger, work } from "./ledger.js";
import { ink, richMetrics, union } from "./metrics.js";
import type { ParagraphDefinition, TextFragmentMeasurement, TextLineMeasurement } from "./types.js";
import { effectiveStyle } from "./validate.js";
import { type Atom, advance, type WrappedLine } from "./wrap.js";

export interface PrivateFragment extends TextFragmentMeasurement {
  readonly baseline: number;
  readonly preparedFont?: PreparedFont;
  readonly glyphs?: readonly PreparedGlyph[];
}
export interface RichLine {
  readonly publicLine: TextLineMeasurement;
  readonly fragments: readonly PrivateFragment[];
}
function groups(atoms: readonly Atom[], budget: WorkLedger, path: string): readonly (readonly Atom[])[] {
  const result: Atom[][] = [];
  for (const atom of atoms) {
    const last = result.at(-1);
    const previous = last?.at(-1);
    if (last && previous?.runIndex === atom.runIndex && previous.end === atom.start) last.push(atom);
    else {
      work(budget, 1, path);
      result.push([atom]);
    }
  }
  return result;
}
function fragment(atoms: readonly Atom[], x: number, baseline: number): PrivateFragment {
  const first = atoms[0];
  const last = atoms.at(-1);
  if (!first || !last) fail("TYPE", "", "Empty private fragment");
  const bounds = [];
  const glyphs: PreparedGlyph[] = [];
  const offset = new MetricSum();
  for (const atom of atoms) {
    bounds.push(ink(atom.metrics, x + offset.value, baseline));
    if (atom.metrics.glyphs) for (const glyph of atom.metrics.glyphs) glyphs.push(glyph);
    offset.add(atom.metrics.advance);
  }
  return {
    text: atoms.map((atom) => atom.text).join(""),
    style: first.style,
    x,
    baseline,
    advance: advance(atoms),
    inkBounds: union(bounds),
    runIndex: first.runIndex,
    source: Object.freeze({ start: first.start, end: last.end }),
    ...(first.metrics.font ? { preparedFont: first.metrics.font, glyphs } : {}),
  };
}
function publicFragment(fragment: PrivateFragment): TextFragmentMeasurement {
  return Object.freeze({
    text: fragment.text,
    style: fragment.style,
    x: fragment.x,
    advance: fragment.advance,
    inkBounds: fragment.inkBounds,
    runIndex: fragment.runIndex,
    source: fragment.source,
  });
}
function envelope(
  line: WrappedLine,
  paragraph: ParagraphDefinition,
  fonts: ResolvedFonts,
  path: string,
  autoHeight = false,
): readonly [number, number] {
  const runs = line.atoms.length
    ? line.atoms.map((atom) => atom.metrics)
    : [richMetrics("", effectiveStyle(paragraph.defaultStyle), fonts, path)];
  const ascent = runs.reduce((maximum, run) => Math.max(maximum, run.ascent), -Infinity);
  const descent = runs.reduce((maximum, run) => Math.max(maximum, run.descent), -Infinity);
  if (!autoHeight && exceeds(sum([ascent, descent]), paragraph.lineHeight))
    fail("FONT_INK", `${path}/lineHeight`, "Ink exceeds rich line height");
  return [ascent, descent];
}
export function line(
  wrapped: WrappedLine,
  paragraph: ParagraphDefinition,
  paragraphIndex: number,
  top: number,
  width: number,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  path: string,
  autoHeight = false,
): RichLine {
  const grouped = groups(wrapped.atoms, budget, path);
  const total = advance(wrapped.atoms);
  const spare = width - total;
  const x = paragraph.align === "center" ? spare / 2 : paragraph.align === "right" ? spare : 0;
  const offset = new MetricSum();
  const [ascent, descent] = envelope(wrapped, paragraph, fonts, path, autoHeight);
  const fontHeight = wrapped.atoms.reduce(
    (height, atom) => Math.max(height, atom.style.fontSize),
    paragraph.lineHeight,
  );
  const height = autoHeight ? Math.max(fontHeight, sum([ascent, descent])) : paragraph.lineHeight;
  const baseline = top + ascent + (height - sum([ascent, descent])) / 2;
  const fragments = grouped.map((atoms) => {
    const result = fragment(atoms, x + offset.value, baseline);
    offset.add(result.advance);
    const bounds = result.inkBounds;
    const leftScale = paragraph.align === "left" ? Math.max(result.x, result.advance, result.style.fontSize) : width;
    if (!bounds.empty && (exceeds(-bounds.left, 0, leftScale) || exceeds(bounds.right, width)))
      fail("FONT_INK", atoms[0]?.path ?? path, "Rich glyph ink exceeds width; adjust alignment/box");
    return result;
  });
  return {
    fragments,
    publicLine: Object.freeze({
      paragraphIndex,
      top,
      height,
      baseline,
      advance: total,
      inkBounds: union(fragments.map((item) => item.inkBounds)),
      fragments: Object.freeze(fragments.map(publicFragment)),
      breakReason: wrapped.breakReason,
    }),
  };
}
