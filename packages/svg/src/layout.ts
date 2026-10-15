import type { NodeDefinition } from "@updf/core";
import { fixed, nativeInline, type FixedBlock, type InlineVisual } from "@updf/layout";
import type { SvgSize } from "./layout-size.js";
import { svgSize } from "./layout-size.js";
import { assertPrepared, compilePreparedSVG, type PreparedSvg } from "./prepared.js";

export type { SvgSize } from "./layout-size.js";
interface PlacedSvg {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
}
function placed(graphic: PreparedSvg, size: SvgSize): PlacedSvg {
  const painting = assertPrepared(graphic);
  const { width, height } = svgSize(painting, size);
  const { node } = compilePreparedSVG(graphic, { x: 0, y: 0, w: width, h: height });
  return { width, height, nodes: Object.freeze([node]) };
}
/** Compile a prepared graphic into canonical fixed native content. */
export function svgBlock(graphic: PreparedSvg, size: SvgSize): FixedBlock {
  const { width, height, nodes } = placed(graphic, size);
  return fixed({ width, height, children: nodes });
}
/** Bottom-baseline inline visual with fixed point advance and zero descent. */
export function svgInline(graphic: PreparedSvg, size: SvgSize): InlineVisual {
  const { width, height, nodes } = placed(graphic, size);
  return nativeInline({ advance: width, ascent: height, nodes });
}
