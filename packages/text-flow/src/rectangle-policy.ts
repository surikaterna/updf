import { fail, validateDataObject } from "@updf/core/internal";
import type { SiblingBlockProps } from "./sibling.js";
import type { SidePolicy, SideQuery } from "./side-policy.js";

export function rectangleQuery(width: number, bottom: number): SideQuery {
  return {
    clears: (top, bottom) => top >= bottom,
    depth: (top) => (top >= bottom ? 0 : width),
    available: (width, depth) => width - depth,
    retry: (top, bottom, nextTop) => (top < bottom ? Math.min(bottom, nextTop) : nextTop),
  };
}
export const rectanglePolicy: SidePolicy<"rect"> = {
  capture(input, path) {
    validateDataObject(input, ["children", "style", "keepTogether", "decorations"], path);
    return { props: input as unknown as SiblingBlockProps<"rect"> };
  },
  marker(shape, _detail, path) {
    if (shape !== undefined && shape !== "rect") fail("VALUE", path, "Expected rect or omitted shape");
    return undefined;
  },
  prepare: (_marker, visual) => ({
    visual,
    query: rectangleQuery(visual.naturalSize.width, visual.naturalSize.height),
  }),
};
