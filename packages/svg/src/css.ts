import type { SourceSpan } from "@updf/core";
import { comments } from "./comments.js";
import { validateDeclaration } from "./declaration.js";
import { svgFail } from "./error.js";
import { range } from "./source.js";
import type { ClassRule, Declaration, SVGDiagnostic } from "./types.js";

export const properties = Object.freeze([
  "fill",
  "stroke",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "visibility",
  "display",
]);

function declaration(
  part: string,
  path: string,
  span: SourceSpan | undefined,
): { name: string; value: string } | undefined {
  const trimmed = part.trim();
  if (!trimmed) return undefined;
  // Find the delimiter once, then trim disjoint slices; whitespace never backtracks.
  const colon = trimmed.indexOf(":");
  const name = trimmed.slice(0, colon).trim();
  const value = trimmed.slice(colon + 1).trim();
  if (colon < 0 || !/^[a-z-]+$/.test(name) || !value) svgFail("SVG_STYLE", path, "Malformed CSS declaration", span);
  return { name, value };
}

export function declarations(
  input: string,
  path: string,
  span: SourceSpan | undefined,
  diagnostics: SVGDiagnostic[],
  offsets?: readonly number[],
): readonly Declaration[] {
  const result: Declaration[] = [];
  let offset = 0;
  for (const part of comments(input, path, span, offsets).split(";")) {
    const location = range(span, offsets, offset, offset + part.length);
    offset += part.length + 1;
    const parsed = declaration(part, path, location);
    if (!parsed) continue;
    const { name, value } = parsed;
    if (!properties.includes(name) || /!important|url\s*\(|var\s*\(/i.test(value))
      svgFail("SVG_UNSUPPORTED", path, "Unsupported CSS property/directive/reference", location);
    if (name === "stroke" && /^(?:'none'|"none")$/.test(value)) {
      diagnostics.push(
        Object.freeze({
          code: "SVG_STYLE",
          severity: "warning",
          path,
          ...(location ? { span: Object.freeze(location) } : {}),
          message:
            "Invalid quoted stroke:'none' declaration discarded (not normalized); inherited/presentation stroke remains",
        }),
      );
      continue;
    }
    if (name === "opacity" && value !== "inherit" && Number(value) !== 1)
      svgFail(
        "SVG_UNSUPPORTED",
        path,
        "Group/element opacity other than1 is unsupported; use fill/stroke opacity",
        location,
      );
    const entry = Object.freeze({ name, value, path, ...(location ? { span: Object.freeze(location) } : {}) });
    validateDeclaration(entry);
    result.push(entry);
  }
  return Object.freeze(result);
}

export function stylesheet(
  input: string,
  path: string,
  span: SourceSpan | undefined,
  diagnostics: SVGDiagnostic[],
  state: { count: number },
  offsets?: readonly number[],
): readonly ClassRule[] {
  const source = comments(input, path, span, offsets);
  const result: ClassRule[] = [];
  let offset = 0;
  while (offset < source.length) {
    const whitespace = /^\s*/.exec(source.slice(offset))?.[0].length ?? 0;
    offset += whitespace;
    if (offset === source.length) break;
    const match = /^([^{}]+)\{([^{}]*)\}/.exec(source.slice(offset));
    if (!match?.[1] || match[2] === undefined)
      svgFail("SVG_STYLE", path, "Unconsumed CSS or nested/at rules", range(span, offsets, offset, source.length));
    const names = match[1].split(",").map((selector) => {
      const name = /^\.([A-Za-z_][A-Za-z0-9_-]*)$/.exec(selector.trim())?.[1];
      if (!name) svgFail("SVG_UNSUPPORTED", path, "Only simple .class selectors are supported", span);
      if (++state.count > 1000) svgFail("LIMIT", path, "CSS class rule budget exceeded", span);
      return name;
    });
    const start = offset + match[0].indexOf("{") + 1;
    const end = start + match[2].length;
    result.push(
      Object.freeze({
        names: Object.freeze(names),
        declarations: declarations(
          match[2],
          path,
          range(span, offsets, start, end),
          diagnostics,
          offsets ? Object.freeze(offsets.slice(start, end + 1)) : undefined,
        ),
      }),
    );
    offset += match[0].length;
  }
  return Object.freeze(result);
}
