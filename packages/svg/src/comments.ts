import type { SourceSpan } from "@updf/core";
import { svgFail } from "./error.js";
import { range } from "./source.js";

/** One forward scan; unterminated comments reject at the first opener. Quotes
 * preserve CSS string contents and offsets, including the quoted-none warning.
 */
export function comments(input: string, path: string, span: SourceSpan, offsets?: readonly number[]): string {
  const pieces: string[] = [];
  let offset = 0;
  let quote = "";
  while (offset < input.length) {
    const char = input[offset] ?? "";
    if (quote) {
      const count = char === "\\" && offset + 1 < input.length ? 2 : 1;
      pieces.push(input.slice(offset, offset + count));
      if (char === quote) quote = "";
      offset += count;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      pieces.push(char);
      offset++;
      continue;
    }
    if (input.startsWith("/*", offset)) {
      const end = input.indexOf("*/", offset + 2);
      if (end < 0) svgFail("SVG_STYLE", path, "Unterminated CSS comment", range(span, offsets, offset, input.length));
      pieces.push(" ".repeat(end + 2 - offset));
      offset = end + 2;
      continue;
    }
    if (input.startsWith("*/", offset))
      svgFail("SVG_STYLE", path, "Unexpected CSS comment close", range(span, offsets, offset, offset + 2));
    pieces.push(char);
    offset++;
  }
  return pieces.join("");
}
