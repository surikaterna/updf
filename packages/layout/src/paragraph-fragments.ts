import { fail } from "@updf/core/internal";
import { LayoutInputError } from "@updf/layout-boxes";
import {
  createRangeOperation,
  type RangeOperation,
  type PreparedSource,
  type SelectionRequest,
} from "@updf/layout-boxes/fragmentation";
import type { ExtensionLifetime } from "./extension-producer.js";

export interface ParagraphMetrics {
  readonly lines: readonly { readonly height: number }[];
  readonly height: number;
}
export interface ParagraphDescriptor {
  readonly measured: ParagraphMetrics;
  readonly keep: boolean;
}
export interface ParagraphFragments {
  readonly operation: RangeOperation<ParagraphDescriptor, number>;
  nextId: number;
}
export function closeParagraphFragments(lifetime: ExtensionLifetime): void {
  lifetime.paragraphFragments?.operation.close();
}
export function selectParagraph(fragments: ParagraphFragments, source: PreparedSource, request: SelectionRequest) {
  try {
    return fragments.operation.select(source, request);
  } catch (error) {
    if (!(error instanceof LayoutInputError)) throw error;
    fail(error.code, error.path, error.message);
  }
}
export function paragraphFragments(lifetime: ExtensionLifetime): ParagraphFragments {
  if (lifetime.paragraphFragments) return lifetime.paragraphFragments;
  const operation = createRangeOperation<ParagraphDescriptor, number>({
    next: (descriptor, request, work) => {
      if (!lifetime.active) fail("MEASUREMENT_CONTEXT", "/paragraph", "Layout operation has closed");
      work.consume(1);
      return {
        end: descriptor.keep ? 1 : request.offset + 1,
        height: !descriptor.measured.lines.length
          ? 0
          : descriptor.keep
            ? descriptor.measured.height
            : descriptor.measured.lines[request.offset]!.height,
        content: request.offset,
      };
    },
  });
  const result = { operation, nextId: 0 };
  lifetime.paragraphFragments = result;
  return result;
}
