import type { NodeDefinition, ParagraphDefinition } from "@updf/core";
import { DocumentError, type InlineLine, type LayoutOperation, paintInlineText, sum } from "@updf/core/internal";
import type { AuthorParagraph } from "./content-normalize.js";
import type { ContentLine } from "./content-types.js";
import type { Extensions } from "./extension-types.js";
import { type PreparedVisual, prepareVisual } from "./inline-adapters.js";

export interface MeasuredParagraph {
  readonly lines: readonly ContentLine[];
  readonly height: number;
  readonly paintLine: (index: number, x: number, y: number) => readonly NodeDefinition[];
}
const caches = new WeakMap<LayoutOperation, WeakMap<AuthorParagraph, Map<number, MeasuredParagraph>>>();
export function measureParagraph(
  author: AuthorParagraph,
  width: number,
  operation: LayoutOperation,
  extensions: Extensions | undefined,
  path: string,
): MeasuredParagraph {
  const cache = caches.get(operation) ?? new WeakMap<AuthorParagraph, Map<number, MeasuredParagraph>>();
  caches.set(operation, cache);
  const widths = cache.get(author) ?? new Map<number, MeasuredParagraph>();
  cache.set(author, widths);
  const previous = widths.get(width);
  if (previous) return previous;
  const result = measuredParagraph(author, width, operation, extensions, path);
  widths.set(width, result);
  return result;
}
function measuredParagraph(
  author: AuthorParagraph,
  width: number,
  operation: LayoutOperation,
  extensions: Extensions | undefined,
  path: string,
): MeasuredParagraph {
  const visuals = new Map<number, PreparedVisual>();
  let measured: readonly InlineLine[];
  try {
    measured = operation.measureInline(
      author.definition,
      () => {
        for (const [index, visual] of author.visuals)
          visuals.set(index, prepareVisual(visual.descriptor, width, visual.style, operation, extensions, visual.path));
        return [...visuals].map(([runIndex, visual]) => ({ runIndex, path: visual.path, metrics: visual.metrics }));
      },
      width,
      author.lineHeights,
      author.path,
    );
  } catch (error) {
    rethrowSource(error, author, author.path);
  }
  const lines = publicLines(measured, author, visuals, path);
  return {
    lines: Object.freeze(lines),
    height: sum(lines.map((line) => line.height)),
    paintLine: (index, x, y) => paintLine(measured[index], author.definition, visuals, width, x, y),
  };
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
function rethrowSource(error: unknown, author: AuthorParagraph, path: string): never {
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
  // Bound nominal fixed-text overhang, not glyph ink. Tight line boxes may
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
