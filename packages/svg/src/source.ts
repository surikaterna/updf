import type { SourceSpan } from "@updf/core";
import type { SourceText, XMLText } from "./types.js";

export function range(
  span: SourceSpan | undefined,
  offsets: readonly number[] | undefined,
  start: number,
  end: number,
): SourceSpan | undefined {
  if (!span) return undefined;
  return Object.freeze({
    start: offsets?.[start] ?? Math.min(span.end, span.start + start),
    end: offsets?.[end] ?? Math.min(span.end, span.start + end),
  });
}

/** XML comments/CDATA delimiters are not logical CSS characters, but their gaps
 * remain in the original source coordinates through each fragment's boundary map.
 */
export function concatenate(parts: readonly XMLText[], empty: SourceSpan | undefined): SourceText {
  if (!empty) return Object.freeze({ value: parts.map((part) => part.text).join("") });
  const offsets: number[] = [];
  const values: string[] = [];
  for (const part of parts) {
    values.push(part.text);
    for (let i = 0; i < part.text.length; i++) offsets.push(part.offsets?.[i] ?? (part.span?.start ?? empty.start) + i);
  }
  const start = parts[0]?.span?.start ?? empty.start;
  const end = parts.at(-1)?.span?.end ?? empty.end;
  offsets.push(end);
  return Object.freeze({
    value: values.join(""),
    offsets: Object.freeze(offsets),
    span: Object.freeze({ start, end }),
  });
}
