import { fail } from "@updf/core/internal";
import { createFragmentOperation, type PreparedSource, type FragmentOperation } from "@updf/layout-boxes/fragmentation";
import {
  paragraphContinuation,
  type ParticipationContext,
  type ParticipationSource,
  type RichParagraphSource,
  type RichParagraphSelection,
} from "@updf/layout/internal-participation";
import type { InlineSelectionOperation } from "@updf/text/selection";

export interface SiblingSource {
  readonly author: ParticipationSource;
  readonly bridge: ReturnType<typeof paragraphContinuation>;
  readonly extent: number;
  readonly start: number;
  readonly token: PreparedSource;
}
type Bridge = RichParagraphSource;
export interface SiblingSources {
  readonly kernel: FragmentOperation<Bridge, RichParagraphSelection>;
  readonly paragraphs: readonly SiblingSource[];
  readonly extent: number;
}
export function siblingSources(
  sources: readonly ParticipationSource[],
  context: ParticipationContext,
  selection: InlineSelectionOperation | undefined,
): SiblingSources {
  const kernel = createFragmentOperation<Bridge, NonNullable<ReturnType<Bridge["select"]>>>({
    next(bridge, request, work) {
      work.consume(1);
      const selected = bridge.select(bridge.resume(request.offset), { width: request.width });
      if (!selected) fail("TYPE", "/textFlow", "Expected one progressing rich line");
      return { end: selected.nextOffset, height: selected.measured.height, content: selected };
    },
  });
  let offset = 1;
  try {
    const paragraphs: SiblingSource[] = sources.map((source, index) => {
      const bridge = paragraphContinuation(
        source.author!,
        context.operation,
        selection ?? fail("MEASUREMENT_CONTEXT", source.path, "Expected selection for an affected Paragraph"),
        context.width,
        context.extensions,
      );
      const extent = bridge.position(bridge.start).extent;
      const start = offset;
      offset += extent;
      if (!Number.isSafeInteger(offset)) fail("LIMIT", source.path, "Sibling source extent overflow");
      return Object.freeze({
        author: source,
        bridge,
        extent,
        start,
        token: kernel.prepare({
          id: String(index),
          path: source.path,
          descriptor: bridge,
          extent,
          mode: "splittable",
          width: { mode: "reflow" },
        }),
      });
    });
    return { kernel, paragraphs: Object.freeze(paragraphs), extent: offset };
  } catch (error) {
    kernel.close();
    throw error;
  }
}
