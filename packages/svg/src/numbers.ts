import type { SourceSpan } from "@updf/core";
import { hasArguments, numeric, type Scanner, whitespace } from "@updf/geometry/internal";
import { mapped, svgFail } from "./error.js";
import type { XMLElement } from "./types.js";

export function length(value: string, path: string, span: SourceSpan | undefined): number {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?(?:px)?$/.test(value.trim()))
    svgFail("SVG_GEOMETRY", path, "Only finite unitless/px lengths are supported", span);
  const result = Number(value.trim().replace(/px$/, ""));
  if (!Number.isFinite(result)) svgFail("SVG_GEOMETRY", path, "Length overflow", span);
  return result;
}
export function attribute(node: XMLElement, key: string, fallback = 0, nonnegative = false): number {
  const value = node.attrs[key];
  const result = value ? length(value.value, `${node.path}/@${key}`, value.span) : fallback;
  if (nonnegative && result < 0)
    svgFail("SVG_GEOMETRY", `${node.path}/@${key}`, "Negative size/radius", value?.span ?? node.span);
  return result;
}
export function numbers(input: string, path: string, span: SourceSpan | undefined): readonly number[] {
  const scan: Scanner = { input, offset: 0, units: 0 };
  const result: number[] = [];
  try {
    whitespace(scan);
    while (scan.offset < input.length) {
      result.push(numeric(scan, false, result.length === 0));
      whitespace(scan);
      if (!hasArguments(scan) && scan.offset < input.length)
        svgFail("SVG_GEOMETRY", path, "Unexpected command in numeric list", span);
    }
  } catch (error: unknown) {
    mapped(error, path, span);
  }
  return Object.freeze(result);
}
