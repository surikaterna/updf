import type { NodeDefinition } from "@updf/core";
import { array, number, snapshotData, validateDataObject as record } from "@updf/core/internal";
import { defineBlockAdapter, defineInlineAdapter, extension, inline } from "@updf/layout";
import type { SvgSize } from "./layout-size.js";
import { svgSize } from "./layout-size.js";
import { assertPrepared, compilePreparedSVG, type PreparedSvg } from "./prepared.js";

export type { SvgSize } from "./layout-size.js";
interface SvgProps {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly NodeDefinition[];
}
function validate(input: unknown): SvgProps {
  record(input, ["width", "height", "nodes"], "/props");
  const width = number(input.width, "/props/width", true);
  const height = number(input.height, "/props/height", true);
  array(input.nodes, 10000, "/props/nodes");
  return { width, height, nodes: snapshotData(input.nodes, "/props/nodes") as readonly NodeDefinition[] };
}
const blockAdapter = defineBlockAdapter<SvgProps>({
  name: "svgBlock",
  validate,
  measure({ width, height, nodes }) {
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width, height },
      fragment: (request) =>
        height > request.availableHeight ? { status: "defer" } : { status: "placed", nextOffset: 1, height, nodes },
    };
  },
});
const inlineAdapter = defineInlineAdapter<SvgProps>({
  name: "svgInline",
  validate,
  measure({ width, height, nodes }, context) {
    const ink = context.measureNative(nodes, { width, height });
    return {
      advance: width,
      ascent: height,
      descent: 0,
      nodes,
      inkBounds: ink.empty ? ink : { ...ink, top: ink.top - height, bottom: ink.bottom - height },
    };
  },
});
/** Install these exact identities with createExtensions(svgAdapters), alongside any other adapters. */
export const svgAdapters = Object.freeze([blockAdapter, inlineAdapter] as const);
function placed(graphic: PreparedSvg, size: SvgSize): SvgProps {
  const painting = assertPrepared(graphic);
  const { width, height } = svgSize(painting, size);
  const { node } = compilePreparedSVG(graphic, { x: 0, y: 0, w: width, h: height });
  return { width, height, nodes: Object.freeze([node]) };
}
/** Snapshot placed native geometry, not the private prepared handle, into an owned block descriptor. */
export function svgBlock(graphic: PreparedSvg, size: SvgSize) {
  return extension(blockAdapter, placed(graphic, size));
}
/** Bottom-baseline inline visual with fixed point advance and zero descent. */
export function svgInline(graphic: PreparedSvg, size: SvgSize) {
  return inline(inlineAdapter, placed(graphic, size));
}
