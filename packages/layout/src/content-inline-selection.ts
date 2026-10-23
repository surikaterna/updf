import { fail, type LayoutOperation } from "@updf/core/internal";
import type { InlineContinuation, InlineSelectionOperation } from "@updf/text/composition";
import type { AuthorParagraph } from "./content-normalize.js";
import { paragraphOutput, rethrowSource } from "./content-paragraph-output.js";
import type { Extensions } from "./extension-types.js";
import { type PreparedVisual, prepareVisual } from "./inline-adapters.js";

/** Rich author metadata stays with layout; the optional text owner retains only generic source positions. */
export function paragraphContinuation(
  author: AuthorParagraph,
  operation: LayoutOperation,
  selection: InlineSelectionOperation,
  width: number,
  extensions: Extensions | undefined,
) {
  const visuals = new Map<number, PreparedVisual>();
  let start: InlineContinuation;
  try {
    start = selection.prepareInline(
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
  return continuationBridge(author, operation, selection, visuals, start);
}
function continuationBridge(
  author: AuthorParagraph,
  operation: LayoutOperation,
  selection: InlineSelectionOperation,
  visuals: ReadonlyMap<number, PreparedVisual>,
  start: InlineContinuation,
) {
  const positions = new WeakSet<object>([start]);
  const check = (continuation: InlineContinuation) => {
    if (!continuation || !positions.has(continuation)) fail("MEASUREMENT_CONTEXT", author.path, "Foreign continuation");
  };
  return Object.freeze({
    start,
    band(continuation: InlineContinuation, top: number) {
      check(continuation);
      return selection.inlineBand(continuation, top, author.path);
    },
    canSelect(continuation: InlineContinuation, width: number) {
      check(continuation);
      return selection.canSelectInline(continuation, width, author.path);
    },
    position(continuation: InlineContinuation) {
      check(continuation);
      return selection.inlinePosition(continuation, author.path);
    },
    resume(offset: number) {
      const continuation = selection.resumeInline(start, offset, author.path);
      positions.add(continuation);
      return continuation;
    },
    select(continuation: InlineContinuation, request: { readonly width: number; readonly maxHeight?: number }) {
      try {
        check(continuation);
        const selected = selection.selectInline(continuation, request, author.path);
        if (!selected) return undefined;
        const result = selection.selectedInline(selected, author.path);
        if (result.continuation) positions.add(result.continuation);
        return {
          startOffset: result.startOffset,
          nextOffset: result.nextOffset,
          measured: paragraphOutput(author, [result.measured], visuals, result.width, operation, author.path),
          continuation: result.continuation,
        };
      } catch (error) {
        rethrowSource(error, author, author.path);
      }
    },
  });
}
