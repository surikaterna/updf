import { defineBlockAdapter, extension, paragraph } from "@updf/layout";
import { compileSVG } from "@updf/svg";
import { inlineSVG, inlineSVGAdapter } from "./optional-inline-svg.js";
import type { TableVisual } from "./tables.js";

export const tableIconSource =
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="24" viewBox="0 0 40 24"><rect x="2" y="2" width="36" height="20" fill="#008000"/><circle cx="20" cy="12" r="6" fill="#ff0000"/></svg>';
const svgAdapter = defineBlockAdapter<Record<never, never>>({
  name: "showcase.table-svg",
  validate(input) {
    if (!input || typeof input !== "object" || Reflect.ownKeys(input).length)
      throw new Error("Expected empty SVG props");
    return {};
  },
  measure(_props, context) {
    const width = Math.min(40, context.width),
      height = 24;
    const compiled = compileSVG(tableIconSource, { x: 0, y: 0, w: width, h: height });
    if (compiled.diagnostics.length) throw new Error("SVG warnings require author acceptance");
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: { width, height },
      fragment: (request) =>
        height > request.availableHeight
          ? { status: "defer" }
          : { status: "placed", nextOffset: 1, height, nodes: [compiled.node] },
    };
  },
});
export const tableVisual: TableVisual = {
  adapters: [svgAdapter, inlineSVGAdapter],
  content: () => [
    extension(svgAdapter, {}),
    paragraph({ style: { lineHeight: 1.8 }, children: ["Inline badge ", inlineSVG(tableIconSource, 20, 12)] }),
  ],
};
