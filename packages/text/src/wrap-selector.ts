import { DocumentError } from "@updf/core/internal";
import { exceeds } from "./arithmetic.js";
import { horizontal, HorizontalMeasure, horizontalWidth, joined, type HorizontalExtent } from "./horizontal.js";
import { type WorkLedger, work } from "./ledger.js";
import type { ParagraphDefinition } from "./types.js";
import type { Atom, WrappedLine } from "./wrap.js";

type Unit = Chunk | undefined;
export interface BlockedLine {
  readonly blocked: DocumentError;
}
interface Chunk {
  readonly atoms: readonly Atom[];
  readonly extent: HorizontalExtent;
  readonly end: number;
}

function units(input: readonly Atom[], collapse: boolean): Unit[] {
  const groups: (Atom[] | undefined)[] = [];
  let pending: Atom | undefined;
  let occupied = false;
  const add = (atom: Atom) => {
    const last = groups.at(-1);
    if (last && !last[0]?.atomic && !atom.atomic && (last[0]?.text === " ") === (atom.text === " ")) last.push(atom);
    else groups.push([atom]);
  };
  for (const atom of input) {
    if (atom.text === "\n") {
      groups.push(undefined);
      pending = undefined;
      occupied = false;
    } else if (collapse && atom.text === " ") pending ??= atom;
    else {
      if (pending && occupied) add(pending);
      pending = undefined;
      add(atom);
      occupied = true;
    }
  }
  groups.push(undefined);
  return groups.map((group) => group && { atoms: group, extent: horizontal(group), end: group.length });
}
function overflow(atom: Atom | undefined, scalar: boolean): BlockedLine {
  return {
    blocked: new DocumentError(
      "TOKEN_OVERFLOW",
      atom?.path ?? "",
      scalar ? "A Unicode scalar exceeds rich text width" : "A token exceeds rich text width",
      atom ? { span: { start: atom.start, end: atom.end } } : {},
    ),
  };
}
function chunk(
  token: Chunk,
  start: number,
  width: number,
  split: boolean,
  charge?: (amount: number) => void,
): Chunk | BlockedLine {
  if (!start && !exceeds(horizontalWidth(token.extent), width)) return token;
  if (!split || token.atoms[0]?.atomic) return overflow(token.atoms[start], false);
  const measure = new HorizontalMeasure();
  let end = start;
  for (; end < token.atoms.length; end++) {
    charge?.(1);
    const atom = token.atoms[end]!;
    const extent = horizontal([atom]);
    if (exceeds(horizontalWidth(extent), width))
      return end === start
        ? overflow(atom, true)
        : { atoms: token.atoms.slice(start, end), extent: measure.extent, end };
    if (exceeds(horizontalWidth(joined(measure.extent, extent)), width)) break;
    measure.add(atom.metrics);
  }
  return { atoms: token.atoms.slice(start, end), extent: measure.extent, end };
}
function append(target: Atom[], items: readonly Atom[], measure: HorizontalMeasure): void {
  // Preserve scalar-order compensated prefixes, not rounded token totals.
  for (const atom of items) {
    target.push(atom);
    measure.add(atom.metrics);
  }
}

/** A blocked first unit never commits source progress. Token measurements are immutable. */
class LineSelector {
  readonly source: readonly Unit[];
  index = 0;
  offset = 0;
  cached: { index: number; offset: number; width: number; value: Chunk | BlockedLine } | undefined;
  constructor(
    input: readonly Atom[],
    readonly paragraph: ParagraphDefinition,
    private readonly budget: WorkLedger,
    private readonly path: string,
    private readonly charge?: (amount: number) => void,
  ) {
    charge?.(input.length);
    this.source = units(input, paragraph.whiteSpace === "collapse");
  }
  private select(i: number, start: number, token: Chunk, width: number) {
    const cached = this.cached;
    if (cached?.index === i && cached.offset === start && cached.width === width) return cached.value;
    const value = chunk(token, start, width, this.paragraph.breakLongWords === "codePoint", this.charge);
    this.cached = { index: i, offset: start, width, value };
    return value;
  }
  next(width: number): WrappedLine | BlockedLine | undefined {
    if (this.done) return undefined;
    let i = this.index;
    let start = this.offset;
    let pending: Chunk | undefined;
    const atoms: Atom[] = [];
    const measure = new HorizontalMeasure();
    const finish = (breakReason: WrappedLine["breakReason"]) => {
      work(this.budget, 1, this.path);
      this.index = i;
      this.offset = start;
      return { atoms, breakReason };
    };
    for (;;) {
      const unit = this.source[i];
      if (!unit) {
        i++;
        start = 0;
        return finish(i === this.source.length ? "paragraphEnd" : "hard");
      }
      if (this.paragraph.whiteSpace === "collapse" && unit.atoms[0]?.text === " ") {
        pending = unit;
        i++;
        continue;
      }
      const selected = this.select(i, start, unit, width);
      if ("blocked" in selected) return atoms.length ? finish("soft") : selected;
      if (
        atoms.length &&
        exceeds(
          horizontalWidth(joined(pending ? joined(measure.extent, pending.extent) : measure.extent, selected.extent)),
          width,
        )
      )
        return finish("soft");
      this.charge?.(selected.atoms.length + (pending?.atoms.length ?? 0));
      if (atoms.length && pending) append(atoms, pending.atoms, measure);
      append(atoms, selected.atoms, measure);
      pending = undefined;
      start = selected.end;
      if (start === unit.atoms.length) {
        i++;
        start = 0;
      }
    }
  }
  get done() {
    return this.index === this.source.length;
  }
  fork(): LineSelector {
    // Source units/cache entries are immutable; only the scalar cursor and cache binding change.
    return Object.assign(Object.create(LineSelector.prototype) as LineSelector, this);
  }
}
export function lineSelector(
  input: readonly Atom[],
  paragraph: ParagraphDefinition,
  budget: WorkLedger,
  path: string,
  charge?: (amount: number) => void,
) {
  return new LineSelector(input, paragraph, budget, path, charge);
}
