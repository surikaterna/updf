import { validateDataObject } from "@updf/core/internal";
import { chargeSourceWork } from "@updf/layout/internal-participation";
import { bits, value } from "@updf/layout-boxes/numeric";
import type { SiblingBlockProps } from "./sibling.js";
import { pathShape, preparePathBand, type SideShape, type PathShape } from "./path-band.js";
import { capturePath, pathVisual, type PathCapture } from "./path.js";
import { rectangleQuery } from "./rectangle-policy.js";
import type { SidePolicy } from "./side-policy.js";

export interface FloatingBlockProps extends SiblingBlockProps<SideShape> {}
interface Detail {
  readonly shape?: PathShape;
  readonly path?: PathCapture;
}
function remaining(width: number, depth: number): number {
  if (depth === 0) return width;
  const n = width - depth;
  return n <= 0 ? 0 : value(bits(n) - 1n);
}
export const pathPolicy: SidePolicy<SideShape> = {
  capture(input, path) {
    const captured = "d" in input ? capturePath(input, path) : undefined;
    if (!captured) validateDataObject(input, ["children", "style", "keepTogether", "decorations"], path);
    const props = input as unknown as FloatingBlockProps;
    return {
      props: captured ? { style: props.style } : props,
      detail: captured,
    };
  },
  marker(input, detail, path) {
    const captured = detail as PathCapture | undefined;
    const shape = captured?.shape ?? pathShape(input, path);
    return { ...(shape ? { shape } : {}), ...(captured ? { path: captured } : {}) };
  },
  prepare(marker, visual, source, context) {
    const detail = marker.detail as Detail;
    const charge = (amount: number) => chargeSourceWork(amount, context.operation, source.path);
    const { width, height } = visual.naturalSize;
    const shape = detail.shape && preparePathBand(detail.shape, width, height, marker.side, charge, source.path);
    const block = detail.path && pathVisual(shape!, detail.path, width, height, charge, source.path);
    return {
      visual: block ? context.prepare({ ...source, block }, width) : visual,
      query: shape
        ? {
            clears: (top, bottom) => top > bottom,
            depth: shape.depth,
            available: remaining,
            retry: (_top, _bottom, nextTop) => nextTop,
          }
        : rectangleQuery(width, height),
    };
  },
};
