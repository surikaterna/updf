import { createFragmentOperation, type FragmentOperation, type ProviderWork } from "@updf/layout-kernel/fragmentation";

export type ProofSource =
  | { readonly kind: "row"; readonly height: number }
  | { readonly kind: "ascii"; readonly text: string };
export interface AsciiPiece {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}
export function proofFragments(): FragmentOperation<ProofSource, AsciiPiece | ProofSource> {
  return createFragmentOperation<ProofSource, AsciiPiece | ProofSource>({
    next: (source, request, work) => {
      if (source.kind === "row") {
        work.consume(1);
        return { end: request.extent, height: source.height, content: source };
      }
      const end = asciiEnd(source.text, request.offset, request.width, work);
      return {
        end,
        height: 1,
        content: Object.freeze({ start: request.offset, end, text: source.text.slice(request.offset, end) }),
      };
    },
  });
}
function asciiEnd(text: string, offset: number, width: number, work: ProviderWork): number {
  if (!Number.isSafeInteger(width) || width < 1) throw new Error("ASCII regions require a positive integer width");
  let end = offset;
  while (end < text.length && end - offset < width) {
    work.consume(1);
    const code = text.charCodeAt(end++);
    if (code === 10) return end;
    if (code < 32 || code > 126) throw new Error("Only printable ASCII and LF are supported");
  }
  if (end < text.length) {
    work.consume(1);
    if (text.charCodeAt(end) === 10) end++;
  }
  return end;
}
