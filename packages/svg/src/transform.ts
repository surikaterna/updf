import type { SourceSpan } from "@updf/core";
import { matrix } from "@updf/core/internal";
import type { Matrix } from "@updf/core/painting";
import { identity, multiply } from "@updf/core/painting";
import { mapped, svgFail } from "./error.js";
import { numbers } from "./numbers.js";
import { range } from "./source.js";

function operation(name: string, values: readonly number[], path: string, span: SourceSpan | undefined): Matrix {
  const a = values[0] ?? 0,
    b = values[1] ?? 0;
  if (name === "matrix" && values.length === 6) return matrix(values, path);
  if (name === "translate" && [1, 2].includes(values.length)) return matrix([1, 0, 0, 1, a, b], path);
  if (name === "scale" && [1, 2].includes(values.length))
    return matrix([a, 0, 0, values.length === 1 ? a : b, 0, 0], path);
  const radians = (a * Math.PI) / 180;
  if (name === "rotate" && [1, 3].includes(values.length)) {
    const rotate = matrix([Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0], path);
    return values.length === 1
      ? rotate
      : multiply(multiply([1, 0, 0, 1, b, values[2] ?? 0], rotate), [1, 0, 0, 1, -b, -(values[2] ?? 0)]);
  }
  if (name === "skewX" && values.length === 1) return matrix([1, 0, Math.tan(radians), 1, 0, 0], path);
  if (name === "skewY" && values.length === 1) return matrix([1, Math.tan(radians), 0, 1, 0, 0], path);
  svgFail("SVG_UNSUPPORTED", path, "Unsupported transform name/arity", span);
}
export function transform(
  input: string | undefined,
  path: string,
  span: SourceSpan | undefined,
  offsets?: readonly number[],
): Matrix {
  if (input === undefined || !input.trim()) return identity;
  let offset = 0;
  let result = identity;
  let count = 0;
  try {
    while (offset < input.length) {
      const spaces = /^[\t\r\n ,]*/.exec(input.slice(offset))?.[0] ?? "";
      if ((!count && spaces.includes(",")) || (spaces.match(/,/g)?.length ?? 0) > 1)
        svgFail("SVG_GEOMETRY", path, "Unexpected transform comma", span);
      offset += spaces.length;
      if (offset === input.length && spaces.includes(","))
        svgFail("SVG_GEOMETRY", path, "Trailing transform comma", span);
      if (offset === input.length) break;
      const match = /^([A-Za-z]+)\s*\(([^()]*)\)/.exec(input.slice(offset));
      if (!match?.[1] || match[2] === undefined)
        svgFail("SVG_GEOMETRY", path, "Unconsumed transform input", range(span, offsets, offset, input.length));
      if (++count > 128) svgFail("LIMIT", path, "Transform list budget exceeded", span);
      result = multiply(result, operation(match[1], numbers(match[2], path, span), path, span));
      offset += match[0].length;
    }
  } catch (error: unknown) {
    mapped(error, path, span);
  }
  return result;
}
