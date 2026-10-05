import type { NodeDefinition } from "@updf/core";
import { type Component, h, type VNode } from "@updf/core/vdom";
import { renderSVG } from "./index.js";
import type { SVGTarget } from "./types.js";

function nodeTree(node: NodeDefinition): VNode {
  if (node.type === "paintGroup")
    return h("paintGroup", {
      ...(node.transform ? { transform: node.transform } : {}),
      ...(node.clip ? { clip: node.clip } : {}),
      children: node.children.map(nodeTree),
    });
  if (node.type === "path")
    return h("path", {
      commands: node.commands,
      ...(node.paint ? { paint: node.paint } : {}),
      ...(node.transform ? { transform: node.transform } : {}),
    });
  throw new Error("SVG adapter produced a non-painting primitive");
}
/** SVG source plus point viewport; the same strict, warning-free contract as renderSVG. */
export interface SvgProps extends SVGTarget {
  readonly source: string;
}
/** Native VDOM component for optional SVG painting; conversion occurs during component evaluation. */
export const Svg: Component<SvgProps> = ({ source, x, y, w, h: height }) =>
  nodeTree(renderSVG(source, { x, y, w, h: height }));
/** Build immutable native VDOM now; throws under renderSVG's warning-free contract. */
export function createSVGTree(source: string, target: SVGTarget): VNode {
  return nodeTree(renderSVG(source, target));
}
