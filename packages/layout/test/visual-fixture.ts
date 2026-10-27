import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import type { BlockStyle } from "@updf/layout";
import { defineVisual } from "@updf/layout/internal-visual";

export interface TestVisualProps {
  readonly tone: "blue";
  readonly style?: BlockStyle;
}
export function testVisual(name = "test.visual", measured = () => {}, captured = () => {}) {
  return defineVisual<TestVisualProps, { readonly tone: "blue" }>({
    name,
    capture(input, path) {
      captured();
      validateDataObject(input, ["tone", "style"], path);
      const tone = ownDataValue(input, "tone", `${path}/tone`);
      if (tone !== "blue") fail("VALUE", `${path}/tone`, "Expected blue");
      const style = ownDataValue(input, "style", `${path}/style`) as BlockStyle | undefined;
      return { props: { ...(style ? { style } : {}) }, visual: { tone } };
    },
    measure(_props, context) {
      measured();
      return {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height: 4 },
        next: () => ({ end: 1, height: 4, nodes: [nativeRect(context.width)] }),
      };
    },
  });
}
export const nativeRect = (width: number) => ({
  type: "rect" as const,
  x: 0,
  y: 0,
  width,
  height: 4,
  paint: { fill: [0, 0, 1] as const, stroke: null },
});
