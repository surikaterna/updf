import { defineInlineAdapter, inline } from "@updf/layout";
import { compileSVG } from "@updf/svg";

/** Application-owned adapter: neither optional package root imports the other. */
export const inlineSVGAdapter = defineInlineAdapter<{ source: string; width: number; height: number }>({
  name: "showcase.inline-svg",
  validate(input) {
    if (
      !input ||
      typeof input !== "object" ||
      !("source" in input) ||
      typeof input.source !== "string" ||
      !("width" in input) ||
      typeof input.width !== "number" ||
      !("height" in input) ||
      typeof input.height !== "number"
    )
      throw new Error("Expected source, width and height");
    return { source: input.source, width: input.width, height: input.height };
  },
  measure({ source, width, height }, context) {
    const compiled = compileSVG(source, { x: 0, y: 0, w: width, h: height });
    if (compiled.diagnostics.length) throw new Error("Inline SVG warnings require explicit author acceptance");
    const nodes = [compiled.node];
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
export function inlineSVG(source: string, width: number, height: number) {
  return inline(inlineSVGAdapter, { source, width, height });
}
