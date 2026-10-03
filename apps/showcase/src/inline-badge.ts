import { defineInlineAdapter, inline } from "@updf/layout";

export const badgeAdapter = defineInlineAdapter<{ height: number }>({
  name: "showcase.badge",
  validate(input) {
    if (
      !input ||
      typeof input !== "object" ||
      !("height" in input) ||
      typeof input.height !== "number" ||
      !Number.isFinite(input.height) ||
      input.height <= 0
    )
      throw new Error("A badge needs positive height");
    return { height: input.height };
  },
  measure({ height }) {
    return {
      advance: height,
      ascent: height,
      descent: 0,
      inkBounds: { empty: false, left: 0, top: -height, right: height, bottom: 0 },
      nodes: [{ type: "rect", x: 0, y: 0, width: height, height, paint: { fill: [0, 0.7, 0.25], stroke: null } }],
    };
  },
});
export function badge(height = 18) {
  return inline(badgeAdapter, { height });
}
