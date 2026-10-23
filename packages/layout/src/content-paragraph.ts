import type { InlineLine, LayoutOperation } from "@updf/core/internal";
import type { AuthorParagraph } from "./content-normalize.js";
import { type MeasuredParagraph, paragraphOutput, rethrowSource } from "./content-paragraph-output.js";
import type { Extensions } from "./extension-types.js";
import { type PreparedVisual, prepareVisual } from "./inline-adapters.js";

export type { MeasuredParagraph } from "./content-paragraph-output.js";
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
  return paragraphOutput(author, measured, visuals, width, operation, path);
}
