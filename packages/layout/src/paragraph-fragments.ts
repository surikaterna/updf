import { fail } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import {
  createFragmentOperation,
  type FragmentOperation,
  fragmentDefaults,
  type PreparedSource,
  type RangeRequest,
} from "@updf/layout-boxes/fragmentation";
import type { MeasuredParagraph } from "./content-paragraph.js";
import type { ExtensionLifetime } from "./extension-producer.js";

export interface ParagraphDescriptor {
  readonly measured: MeasuredParagraph;
  readonly keep: boolean;
}
export interface ParagraphFragments {
  readonly operation: FragmentOperation<ParagraphDescriptor, number>;
  nextId: number;
}
export function closeParagraphFragments(lifetime: ExtensionLifetime): void {
  lifetime.paragraphFragments?.operation.close();
}
export function selectParagraph(fragments: ParagraphFragments, source: PreparedSource, request: RangeRequest) {
  try {
    return fragments.operation.select(source, request);
  } catch (error) {
    if (!(error instanceof LayoutInputError)) throw error;
    fail(error.code, error.path, error.message);
  }
}
export function paragraphFragments(lifetime?: ExtensionLifetime): ParagraphFragments {
  if (lifetime?.paragraphFragments) return lifetime.paragraphFragments;
  const limits = Object.fromEntries(Object.keys(fragmentDefaults).map((key) => [key, Number.MAX_SAFE_INTEGER]));
  const operation = createFragmentOperation<ParagraphDescriptor, number>(
    {
      next: (descriptor, request, work) => {
        if (lifetime && !lifetime.active) fail("MEASUREMENT_CONTEXT", "/paragraph", "Layout operation has closed");
        work.consume(1);
        return {
          end: descriptor.keep ? 1 : request.offset + 1,
          height: descriptor.keep ? descriptor.measured.height : descriptor.measured.lines[request.offset]!.height,
          content: request.offset,
        };
      },
    },
    limits,
  );
  const result = { operation, nextId: 0 };
  if (lifetime) lifetime.paragraphFragments = result;
  return result;
}
