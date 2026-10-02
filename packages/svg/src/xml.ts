import { svgFail } from "./error.js";
import type { Attribute, XMLElement, XMLScanner, XMLText } from "./types.js";
import { comment, entities, name, sourceCheck, space } from "./xml-lex.js";

function attributes(scan: XMLScanner, path: string): Readonly<Record<string, Attribute>> {
  const result: Record<string, Attribute> = Object.create(null);
  let count = 0;
  while (!scan.source.startsWith(">", scan.offset) && !scan.source.startsWith("/>", scan.offset)) {
    const before = scan.offset;
    space(scan);
    if (scan.source.startsWith(">", scan.offset) || scan.source.startsWith("/>", scan.offset)) break;
    if (before === scan.offset)
      svgFail("SVG_XML", path, "Attributes require whitespace", { start: before, end: before + 1 });
    if (++count > 64) svgFail("LIMIT", path, "Attribute budget exceeded", { start: before, end: scan.offset });
    const key = name(scan);
    if (Object.hasOwn(result, key))
      svgFail("SVG_XML", `${path}/@${key}`, "Duplicate XML attribute", { start: before, end: scan.offset });
    space(scan);
    if (scan.source[scan.offset++] !== "=")
      svgFail("SVG_XML", path, "Expected attribute assignment", { start: scan.offset - 1, end: scan.offset });
    space(scan);
    const quote = scan.source[scan.offset++];
    if (quote !== '"' && quote !== "'")
      svgFail("SVG_XML", path, "Attribute values must be quoted", { start: scan.offset - 1, end: scan.offset });
    const start = scan.offset;
    const end = scan.source.indexOf(quote, start);
    if (end < 0 || scan.source.slice(start, end).includes("<"))
      svgFail("SVG_XML", path, "Unterminated/invalid attribute", { start, end: Math.max(start, end) });
    result[key] = entities(scan.source.slice(start, end), start, `${path}/@${key}`);
    scan.offset = end + 1;
  }
  return Object.freeze(result);
}
function text(scan: XMLScanner, path: string): XMLText {
  const start = scan.offset;
  const cdata = scan.source.startsWith("<![CDATA[", start);
  const end = cdata ? scan.source.indexOf("]]>", start + 9) : scan.source.indexOf("<", start);
  if (end < 0) svgFail("SVG_XML", path, "Unterminated XML text/CDATA", { start, end: scan.source.length });
  const raw = scan.source.slice(cdata ? start + 9 : start, end);
  const decoded = entities(raw, cdata ? start + 9 : start, path, cdata);
  if (!cdata && raw.includes("]]>")) svgFail("SVG_XML", path, "Invalid XML character data", { start, end });
  scan.offset = cdata ? end + 3 : end;
  return Object.freeze({ kind: "text", text: decoded.value, offsets: decoded.offsets, path, span: decoded.span });
}
function children(scan: XMLScanner, tag: string, path: string, depth: number): readonly (XMLElement | XMLText)[] {
  const result: (XMLElement | XMLText)[] = [];
  while (!scan.source.startsWith("</", scan.offset)) {
    if (scan.offset >= scan.source.length)
      svgFail("SVG_XML", path, "Missing closing tag", { start: scan.offset, end: scan.offset });
    if (comment(scan)) continue;
    const childPath = `${path}/children/${result.length}`;
    result.push(
      scan.source[scan.offset] === "<" && !scan.source.startsWith("<![CDATA[", scan.offset)
        ? element(scan, childPath, depth + 1)
        : text(scan, childPath),
    );
  }
  scan.offset += 2;
  const closing = name(scan);
  space(scan);
  if (closing !== tag || scan.source[scan.offset++] !== ">")
    svgFail("SVG_XML", path, "Mismatched closing tag", { start: scan.offset - closing.length - 3, end: scan.offset });
  return Object.freeze(result);
}
function element(scan: XMLScanner, path: string, depth: number): XMLElement {
  const start = scan.offset;
  if (depth > 64 || ++scan.elements > 10000)
    svgFail("LIMIT", path, "SVG element/depth budget exceeded", { start, end: start + 1 });
  if (scan.source[scan.offset++] !== "<" || /[!?]/.test(scan.source[scan.offset] ?? ""))
    svgFail("SVG_XML", path, "DTD/entities/processing instructions are forbidden", { start, end: scan.offset + 1 });
  const tag = name(scan);
  const attrs = attributes(scan, path);
  const self = scan.source.startsWith("/>", scan.offset);
  if (!self && scan.source[scan.offset] !== ">")
    svgFail("SVG_XML", path, "Missing tag end", { start, end: scan.offset });
  scan.offset += self ? 2 : 1;
  const content = self ? Object.freeze([]) : children(scan, tag, path, depth);
  return Object.freeze({
    kind: "element",
    name: tag,
    attrs,
    children: content,
    path,
    span: Object.freeze({ start, end: scan.offset }),
  });
}
export function parseXML(source: string): XMLElement {
  sourceCheck(source);
  const scan: XMLScanner = { source, offset: source.startsWith("\ufeff") ? 1 : 0, elements: 0 };
  if (source.startsWith("<?xml", scan.offset)) {
    const header =
      /^<\?xml\s+version=(["'])1\.0\1(?:\s+encoding=(["'])UTF-8\2)?(?:\s+standalone=(["'])(?:yes|no)\3)?\s*\?>/i.exec(
        source.slice(scan.offset),
      );
    if (!header)
      svgFail("SVG_XML", "/svg", "Unsupported XML declaration", { start: scan.offset, end: scan.offset + 5 });
    scan.offset += header[0].length;
  }
  space(scan);
  while (comment(scan)) space(scan);
  const result = element(scan, "/svg", 0);
  space(scan);
  while (comment(scan)) space(scan);
  if (scan.offset !== source.length)
    svgFail("SVG_XML", "/svg", "Multiple roots/unconsumed XML", { start: scan.offset, end: source.length });
  return result;
}
