import type { Component, VNode } from "@updf/core/vdom";
import { svgTree } from "./bridge.js";
import { renderSVG } from "./index.js";
import type { SVGTarget } from "./types.js";

/** SVG source plus point viewport; the same strict, warning-free contract as renderSVG. */
export interface SvgProps extends SVGTarget {
  readonly source: string;
}
/** Native VDOM component for optional SVG painting; conversion occurs during component evaluation. */
export const Svg: Component<SvgProps> = ({ source, x, y, w, h: height }) =>
  svgTree(renderSVG(source, { x, y, w, h: height }));
/** Build immutable native VDOM now; throws under renderSVG's warning-free contract. */
export function createSVGTree(source: string, target: SVGTarget): VNode {
  return svgTree(renderSVG(source, target));
}
