import type { PreparedFont } from "@updf/fonts";
import { parseColor, parsePathData } from "@updf/geometry";
import { resolveWidths } from "@updf/layout-kernel";
import { compileSVG } from "@updf/svg";
import { createSVGTree } from "@updf/svg/tree";

export function allocateAndPaint() {
  const allocation = resolveWidths({ availableWidth: 80, tracks: [20, { weight: 1 }], gap: 1 });
  const commands = parsePathData("M0 0h10v10z");
  const color = parseColor("#ff000080");
  return { allocation, commands, color };
}

export const svgSource = '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
export const svgTarget = { x: 20, y: 20, w: 100, h: 100 };

export function compilePainting() {
  const result = compileSVG(svgSource, svgTarget);
  if (result.diagnostics.length) throw new Error("Review SVG warnings before painting");
  return { painting: result.node, tree: createSVGTree(svgSource, svgTarget) };
}

export async function prepareTrustedFont(bytes: Uint8Array<ArrayBuffer>): Promise<PreparedFont> {
  const { prepareFont } = await import("@updf/fontkit");
  return prepareFont(bytes);
}
