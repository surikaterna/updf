import type { PaintingGroupNode } from "@updf/core";
import { svgFail } from "./error.js";
import { checkedTarget, compilePreparedSVG, type PreparedSvg, prepareRoot } from "./prepared.js";
import type { SVGCompilation, SVGTarget } from "./types.js";
import { parseXML } from "./xml.js";

export { SVGError } from "./error.js";
export type { SVGCompilation, SVGDiagnostic, SVGTarget } from "./types.js";
export type { PreparedSvg } from "./prepared.js";

/** Parse, inspect and validate SVG geometry once, independently of placement. */
export function prepareSVG(source: string): PreparedSvg {
  return prepareRoot(parseXML(source));
}

/**
 * Compile a strict SVG shape subset to native painting, without DOM or resource loading.
 * Supports svg/g, path/rect/line/circle/ellipse/polygon/polyline, transforms,
 * viewBox and restricted paint CSS; defs contains styles only, title/desc are inert.
 * Without viewBox, positive intrinsic width and height are required on the SVG root.
 * Text, images, references, gradients, filters and scripts are not supported.
 * Target coordinates are points; its viewport clips painting, not PDF data (no redaction).
 * Returns a frozen compilation and diagnostics array. Legacy CSS warnings require
 * caller review; other unsupported/malformed input throws SVGError with source spans.
 * Limits include 1 MiB UTF-8 source, 10000 elements, depth 64, 64 attributes per
 * element and 100000 total emitted path commands; geometry has per-path limits too.
 */
export function compileSVG(source: string, target: SVGTarget): SVGCompilation {
  const root = parseXML(source);
  const checked = checkedTarget(target, { start: 0, end: 0 });
  return compilePreparedSVG(prepareRoot(root), checked);
}
/**
 * Compile using compileSVG's subset, limits and viewport semantics, rejecting any warning.
 * Throws SVGError on warnings as well as invalid input. Use compileSVG when deliberately
 * reviewing/accepting diagnostics; this function does not silently discard unsupported CSS.
 */
export function renderSVG(source: string, target: SVGTarget): PaintingGroupNode {
  const result = compileSVG(source, target);
  const warning = result.diagnostics[0];
  if (warning)
    svgFail("SVG_STYLE", warning.path, `${warning.message}; use compileSVG to inspect/accept warnings`, warning.span);
  return result.node;
}
