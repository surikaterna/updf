import type { NodeDefinition, ParagraphDefinition } from "@updf/core";
import { DocumentError, fail, type InlineLine, type LayoutOperation, sum } from "@updf/core/internal";
import { paintInlineText } from "@updf/text";
import type { BudgetTotals } from "./budget.js";
import type { AuthorParagraph } from "./content-normalize.js";
import type { ContentLine } from "./content-types.js";
import type { PreparedVisual } from "./inline-adapters.js";
import { backgroundCount, inlineBackgrounds } from "./inline-background.js";
import { paragraphEmission } from "./paragraph-emission.js";

export interface MeasuredParagraph {
  readonly lineOffsets?: readonly number[];
  readonly lines: readonly ContentLine[];
  readonly height: number;
  readonly backgroundCount: (index: number) => number;
  readonly emissionCounts: (index: number) => BudgetTotals;
  readonly paintLine: (index: number, x: number, y: number, background?: boolean) => readonly NodeDefinition[];
}
/** Optional host positioning preserves selected metrics and the common paragraph painter. */
export function positionedParagraphSequence(
  entries: readonly { readonly measured: MeasuredParagraph; readonly x: number; readonly y: number }[],
): MeasuredParagraph {
  for (const entry of entries)
    if (
      entry.measured.lines.length !== 1 ||
      !Number.isFinite(entry.x) ||
      entry.x < 0 ||
      !Number.isFinite(entry.y) ||
      entry.y < 0
    )
      fail("GEOMETRY", "", "Expected one positioned line per entry");
  const measured = paragraphSequence(entries.map((entry) => entry.measured));
  const shift = (ink: ContentLine["inkBounds"], x: number) =>
    ink.empty ? ink : { ...ink, left: sum([ink.left, x]), right: sum([ink.right, x]) };
  return {
    ...measured,
    height: entries.length ? sum([entries.at(-1)!.y, entries.at(-1)!.measured.height]) : 0,
    lineOffsets: Object.freeze(entries.map((entry) => entry.y)),
    lines: Object.freeze(
      measured.lines.map((line, index) => ({
        ...line,
        inkBounds: shift(line.inkBounds, entries[index]!.x),
        fragments: line.fragments.map((fragment) => ({
          ...fragment,
          x: sum([fragment.x, entries[index]!.x]),
          inkBounds: shift(fragment.inkBounds, entries[index]!.x),
        })),
      })),
    ),
    paintLine: (index, x, y, background) => measured.paintLine(index, sum([x, entries[index]!.x]), y, background),
  };
}
/** Join selected line outputs without changing their metric, emission or painting owners. */
export function paragraphSequence(measured: readonly MeasuredParagraph[]): MeasuredParagraph {
  const entries = measured.flatMap((paragraph) => paragraph.lines.map((line, index) => ({ paragraph, line, index })));
  return {
    lines: Object.freeze(entries.map((entry) => entry.line)),
    height: sum(entries.map((entry) => entry.line.height)),
    backgroundCount: (index) => entries[index]!.paragraph.backgroundCount(entries[index]!.index),
    emissionCounts: (index) => entries[index]!.paragraph.emissionCounts(entries[index]!.index),
    paintLine: (index, x, y, background) =>
      entries[index]!.paragraph.paintLine(entries[index]!.index, x, y, background),
  };
}
export function paragraphOutput(
  author: AuthorParagraph,
  measured: readonly InlineLine[],
  visuals: ReadonlyMap<number, PreparedVisual>,
  width: number,
  operation: LayoutOperation,
  path: string,
): MeasuredParagraph {
  const lines = publicLines(measured, author, visuals, path);
  const emissions = measured.map((line) => paragraphEmission(line, visuals));
  return {
    lines: Object.freeze(lines),
    height: sum(lines.map((line) => line.height)),
    emissionCounts: (index) => emissions[index]!,
    backgroundCount: (index) => (measured[index] ? backgroundCount(measured[index], author) : 0),
    paintLine: (index, x, y, background = false) =>
      background
        ? paintBackground(measured[index], author, operation, visuals, x, y)
        : paintLine(measured[index], author.definition, visuals, width, x, y),
  };
}
function paintBackground(
  measured: InlineLine | undefined,
  author: AuthorParagraph,
  operation: LayoutOperation,
  visuals: ReadonlyMap<number, PreparedVisual>,
  x: number,
  y: number,
): readonly NodeDefinition[] {
  if (!measured || !backgroundCount(measured, author)) return [];
  return [
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, x, y],
      children: inlineBackgrounds(measured, author, operation, visuals),
    },
  ];
}
function publicLines(
  measured: readonly InlineLine[],
  author: AuthorParagraph,
  visuals: ReadonlyMap<number, PreparedVisual>,
  path: string,
): ContentLine[] {
  return measured.map(
    ({ line }): ContentLine =>
      Object.freeze({
        ...line,
        fragments: Object.freeze(
          line.fragments.map((fragment) => {
            const sourcePath = author.sources[fragment.runIndex] ?? path;
            return Object.freeze(
              visuals.has(fragment.runIndex)
                ? {
                    role: "visual" as const,
                    x: fragment.x,
                    advance: fragment.advance,
                    inkBounds: fragment.inkBounds,
                    source: Object.freeze({ path: sourcePath }),
                  }
                : {
                    ...fragment,
                    role: "text" as const,
                    source: Object.freeze({ path: sourcePath, ...fragment.source }),
                  },
            );
          }),
        ),
      }),
  );
}
export function rethrowSource(error: unknown, author: AuthorParagraph, path: string): never {
  if (!(error instanceof DocumentError)) throw error;
  const diagnostic = error.diagnostics[0];
  if (!diagnostic) throw error;
  if (!diagnostic.path.startsWith(`${path}/paragraphs/0`)) throw error;
  const prefix = `${path}/paragraphs/0/runs/`;
  const tail = diagnostic.path.startsWith(prefix) ? diagnostic.path.slice(prefix.length) : "";
  const index = Number(tail.split("/")[0]);
  const source = tail && sourcePath(author, index, tail);
  throw new DocumentError(
    diagnostic.code,
    source || diagnostic.path.replace(`${path}/paragraphs/0`, path),
    diagnostic.message,
    diagnostic,
  );
}
function sourcePath(author: AuthorParagraph, index: number, tail: string): string | undefined {
  const fields = tail.split("/");
  const field = fields[2];
  if (fields[1] === "style" && (field === "font" || field === "fontSize" || field === "color")) {
    const path = author.styleSources[index]?.[field];
    return path && `${path}${fields.length > 3 ? `/${fields.slice(3).join("/")}` : ""}`;
  }
  return author.sources[index];
}
function paintLine(
  measured: InlineLine | undefined,
  paragraph: ParagraphDefinition,
  visuals: ReadonlyMap<number, PreparedVisual>,
  width: number,
  x: number,
  y: number,
): readonly NodeDefinition[] {
  if (!measured) return [];
  const { line } = measured;
  const text = paintInlineText(measured, paragraph, 0, 0, new Set(visuals.keys()))[0];
  if (text?.type !== "paintGroup") return [];
  const native = text.children[Symbol.iterator]();
  const children = line.fragments.flatMap((fragment): NodeDefinition[] => {
    const visual = visuals.get(fragment.runIndex);
    if (visual) {
      if (!visual.measurement.nodes.length) return [];
      return [
        {
          type: "paintGroup",
          transform: [1, 0, 0, 1, fragment.x, line.baseline - line.top - visual.measurement.ascent],
          children: visual.measurement.nodes,
        },
      ];
    }
    const node = native.next().value;
    return node ? [node] : [];
  });
  // Include inline ink overhang in the clip. Tight line boxes may
  // overlap; their full ink envelope must still fit the page or an explicit clip.
  const top = line.inkBounds.empty ? 0 : Math.min(0, line.inkBounds.top - line.top);
  const bottom = line.inkBounds.empty ? line.height : Math.max(line.height, line.inkBounds.bottom - line.top);
  return [
    {
      type: "paintGroup",
      transform: [1, 0, 0, 1, x, y],
      clip: { x: 0, y: top, width, height: bottom - top },
      children,
    },
  ];
}
