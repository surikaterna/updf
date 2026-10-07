import type { Component } from "@updf/core/vdom";
import type { SvgNode } from "./authoring-types.js";
import { svgTree } from "./bridge.js";
import { assertPrepared, compilePreparedSVG, type PreparedSvg, prepareRoot } from "./prepared.js";
import { structuredRoot } from "./structured.js";
import type { SVGTarget } from "./types.js";

export { SVGError } from "./error.js";
export { compilePreparedSVG } from "./prepared.js";
export type { PreparedSvg } from "./prepared.js";
export type { SvgElement, SvgNode } from "./authoring-types.js";
export type { SVGCompilation, SVGDiagnostic, SVGTarget } from "./types.js";
/** Own and validate structured SVG data once; never parses or generates XML. */
export function prepareSVGTree(node: SvgNode): PreparedSvg {
  return prepareRoot(structuredRoot(node));
}
/**
 * Bind an owned painting to a reusable synchronous native component with target-only props.
 * Rejects warnings at binding; use compilePreparedSVG to inspect/accept warnings instead.
 * Each instance validates its whole target and uses native PDF painting, not DOM or resources.
 */
export function createSVGComponent(graphic: PreparedSvg): Component<SVGTarget> {
  assertPrepared(graphic);
  return (target) => svgTree(compilePreparedSVG(graphic, target).node);
}
