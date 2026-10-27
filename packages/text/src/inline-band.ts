import { fail, finite, number } from "@updf/core/internal";
import { bits, successor, value } from "@updf/layout-boxes/numeric";
import { sum } from "./arithmetic.js";
import { add, half, hull, interval, max, metricSum2, sub, type Interval } from "./inline-band-interval.js";
import { participant, type InlineLineHeights, type LineEnvelope } from "./line-height.js";
import { richMetrics } from "./metrics.js";
import type { ResolvedTextResources } from "./text-resources.js";
import type { ParagraphDefinition } from "./types.js";
import { effectiveStyle } from "./validate.js";
import type { Atom } from "./wrap.js";

export interface BandSource {
  readonly paragraph: ParagraphDefinition;
  readonly height: boolean | InlineLineHeights;
  readonly fonts: ResolvedTextResources;
  readonly atoms: readonly Atom[];
}
export interface BandCertificate {
  readonly above: Interval;
  readonly height: Interval;
  readonly leading?: Interval;
  readonly glyph: Interval;
  readonly nominalHeight: number;
}
type Charge = (amount: number, path: string) => void;

export function prepareBand(source: BandSource, charge: Charge, path: string): BandCertificate {
  let glyph = interval(0);
  for (const atom of source.atoms) {
    charge(1, path);
    if (!atom.metrics.empty) glyph = hull(glyph, interval(atom.metrics.top, atom.metrics.bottom, path));
  }
  const geometry =
    typeof source.height === "boolean"
      ? booleanBand(source, source.height, charge, path)
      : explicitBand(source, source.height, charge, path);
  number(geometry.nominalHeight, path, true);
  return { ...geometry, glyph };
}
function booleanBand(source: BandSource, auto: boolean, charge: Charge, path: string) {
  const { paragraph, fonts, atoms } = source;
  charge(1, path);
  const empty = richMetrics("", paragraph.defaultStyle, fonts, path);
  let above = interval(empty.ascent, empty.ascent, path);
  let below = interval(empty.descent, empty.descent, path);
  let fontHeight = paragraph.lineHeight;
  for (const atom of atoms) {
    above = hull(above, interval(atom.metrics.ascent, atom.metrics.ascent, path));
    below = hull(below, interval(atom.metrics.descent, atom.metrics.descent, path));
    fontHeight = Math.max(fontHeight, atom.style.fontSize);
  }
  const natural = metricSum2(above, below, path);
  const height = interval(paragraph.lineHeight, auto ? Math.max(fontHeight, natural.hi) : paragraph.lineHeight, path);
  return { above, height, leading: half(sub(height, natural, path), path), nominalHeight: paragraph.lineHeight };
}
function explicitBand(source: BandSource, heights: InlineLineHeights, charge: Charge, path: string) {
  const { paragraph, fonts, atoms } = source;
  charge(1, path);
  const strut = participant(paragraph.defaultStyle, heights.strut, fonts, path);
  let above = interval(strut.above),
    height = interval(strut.height);
  const seen = new Set<number>();
  for (const atom of atoms) {
    if (seen.has(atom.runIndex)) continue;
    seen.add(atom.runIndex);
    charge(1, path);
    const box = atom.atomic
      ? visualBox(atom, path)
      : participant(
          effectiveStyle(paragraph.defaultStyle, paragraph.runs[atom.runIndex]?.style),
          heights.runs?.[atom.runIndex] ?? heights.strut,
          fonts,
          path,
        );
    const ai = max(above, interval(box.above));
    const hi = max(
      add(height, sub(ai, above, path), path),
      add(interval(box.height), sub(ai, interval(box.above), path), path),
    );
    // Skip/include use OLD state: the hull covers every ordered selected subset.
    above = hull(above, ai);
    height = hull(height, hi);
  }
  return { above, height, nominalHeight: strut.height };
}
function visualBox(atom: Atom, path: string): LineEnvelope {
  const above = finite(atom.metrics.ascent, path),
    below = finite(atom.metrics.descent, path);
  return { above, below, height: number(sum([above, below]), path) };
}
function baseline(certificate: BandCertificate, top: number, path: string): Interval {
  const result = add(interval(top), certificate.above, path);
  return certificate.leading ? add(result, certificate.leading, path) : result;
}
export function queryBand(certificate: BandCertificate, top: number, path: string) {
  number(top, `${path}/top`);
  const direct = add(baseline(certificate, top, path), certificate.glyph, path);
  const translated = add(interval(top), add(baseline(certificate, 0, path), certificate.glyph, path), path);
  const ink = hull(direct, translated);
  const bottom = Math.max(add(interval(top), certificate.height, path).hi, ink.hi);
  let nextTop = finite(top + certificate.nominalHeight, path);
  if (nextTop <= top) {
    const next = successor(bits(top));
    if (next === undefined) fail("GEOMETRY", path, "Inline band retry cannot advance");
    nextTop = finite(value(next), path);
  }
  if (nextTop <= top) fail("GEOMETRY", path, "Inline band retry cannot advance");
  return Object.freeze({ top: Math.min(top, ink.lo), bottom, nominalHeight: certificate.nominalHeight, nextTop });
}
