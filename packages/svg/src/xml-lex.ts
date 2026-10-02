import { svgFail } from "./error.js";
import type { SourceText, XMLScanner } from "./types.js";

export function validScalar(code: number): boolean {
  return (
    code === 9 ||
    code === 10 ||
    code === 13 ||
    (code >= 32 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}
export function sourceCheck(source: string): void {
  if (typeof source !== "string") svgFail("SVG_XML", "/svg", "Expected SVG source string", { start: 0, end: 0 });
  if (source.length > 1024 * 1024) svgFail("LIMIT", "/svg", "SVG source exceeds1MiB", { start: 0, end: source.length });
  let bytes = 0;
  let offset = 0;
  for (const char of source) {
    const code = char.codePointAt(0);
    if (code === undefined || !validScalar(code))
      svgFail("SVG_XML", "/svg", "Invalid XML scalar", { start: offset, end: offset + char.length });
    bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
    if (bytes > 1024 * 1024) svgFail("LIMIT", "/svg", "SVG UTF8 source exceeds1MiB", { start: 0, end: source.length });
    offset += char.length;
  }
}
export function space(scan: XMLScanner): void {
  while (/[\t\r\n ]/.test(scan.source[scan.offset] ?? "") && scan.offset < scan.source.length) scan.offset++;
}
export function name(scan: XMLScanner): string {
  const match = /^[A-Za-z_][A-Za-z0-9_.:-]*/.exec(scan.source.slice(scan.offset));
  if (!match) svgFail("SVG_XML", "/svg", "Expected XML name", { start: scan.offset, end: scan.offset + 1 });
  scan.offset += match[0].length;
  return match[0];
}
export function comment(scan: XMLScanner): boolean {
  if (!scan.source.startsWith("<!--", scan.offset)) return false;
  const start = scan.offset;
  const end = scan.source.indexOf("-->", start + 4);
  if (end < 0 || scan.source.slice(start + 4, end).includes("--"))
    svgFail("SVG_XML", "/svg", "Malformed XML comment", { start, end: Math.max(start + 4, end) });
  scan.offset = end + 3;
  return true;
}
function entityValue(entity: string, start: number, path: string): string {
  const named: Readonly<Record<string, string>> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
  };
  const found = Object.hasOwn(named, entity) ? named[entity] : undefined;
  if (found) return found;
  const number = /^&#(x[0-9a-fA-F]+|[0-9]+);$/.exec(entity)?.[1];
  const code = number ? (number.startsWith("x") ? parseInt(number.slice(1), 16) : Number(number)) : NaN;
  if (!validScalar(code))
    svgFail("SVG_XML", path, "Unknown/invalid entity; external entities are forbidden", {
      start,
      end: start + entity.length,
    });
  return String.fromCodePoint(code);
}
export function entities(text: string, start: number, path: string, literal = false): SourceText {
  const offsets: number[] = [];
  const pieces: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const begin = offset;
    let value = text[offset] ?? "";
    if (!literal && value === "&") {
      const end = text.indexOf(";", offset + 1);
      if (end < 0)
        svgFail("SVG_XML", path, "Unterminated XML entity", { start: start + offset, end: start + text.length });
      value = entityValue(text.slice(offset, end + 1), start + offset, path);
      offset = end + 1;
    } else offset++;
    pieces.push(value);
    for (let i = 0; i < value.length; i++) offsets.push(start + begin);
  }
  offsets.push(start + text.length);
  return Object.freeze({
    value: pieces.join(""),
    offsets: Object.freeze(offsets),
    span: Object.freeze({ start, end: start + text.length }),
  });
}
