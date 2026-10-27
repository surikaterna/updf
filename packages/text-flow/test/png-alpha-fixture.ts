import { h } from "@updf/core/vdom";
import { Block, Document, Flow } from "@updf/layout";
import { Image } from "@updf/images";
import { floatable } from "@updf/text-flow";
import { Source } from "@updf/text-flow/sources";

export const FloatingImage = floatable(Image);
export const FloatingBlock = floatable(Block);
export function maskBlock(threshold: unknown) {
  return h(FloatingBlock, {
    style: {
      width: 80,
      height: 80,
      float: "left",
      shapeOutside: Source.url("same.png"),
      shapeImageThreshold: threshold,
    },
  } as never);
}
export function maskTree(
  shapeOutside: unknown = Source.url("mask.png"),
  src?: Parameters<typeof Image>[0]["src"],
  threshold = 0,
) {
  const style = { width: 80, height: 80, float: "left", shapeOutside, shapeImageThreshold: threshold };
  return document([
    src === undefined ? h(FloatingBlock, { style } as never) : h(FloatingImage, { src, style } as never),
  ]);
}
export function document(children: unknown[]) {
  return h(Document, {
    children: children.map((child) =>
      h(Flow, {
        pageSize: { width: 220, height: 300 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: child,
      } as never),
    ),
  });
}
