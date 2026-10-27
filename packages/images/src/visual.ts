import { fail, useOperationExtension } from "@updf/core/internal";
import { defineVisual, visualContentHeight, publishVisualReference } from "@updf/layout/internal-visual";
import { imageCapability, imagesFeature, type ImageBinding } from "./binding.js";
import { captureImage } from "./capture.js";
import { imagePlacement } from "./placement.js";
import { imageSource, sourceUrl } from "./source.js";
import type { ImageCapture, ImageProps } from "./types.js";
import { ownImagePreparation } from "./preparation-owner.js";

export { imageCapability, imagesFeature };
export const visual = defineVisual<ImageProps, ImageCapture>({
  name: "Image",
  capture: captureImage,
  prepare: (props, resource) => Object.freeze({ ...props, src: imageSource(resource, "/preparation/Image/src") }),
  measure(props, context) {
    if (sourceUrl(props.src) !== undefined)
      fail("PHASE", context.sourcePath, "URL Image requires @updf/images/load and renderAsync preparation");
    const src = imageSource(props.src, `${context.sourcePath}/src`);
    const binding = useOperationExtension<ImageBinding>(context, imagesFeature);
    const resource = binding.resolve(src, context.chargeSourceWork);
    const height = visualContentHeight(context);
    const placement = imagePlacement(context.width, height, src.metadata, props.fit, context.sourcePath);
    const node = Object.freeze({ type: "xObject" as const, resource, ...placement });
    return publishVisualReference(
      context,
      {
        fragmentation: "atomic",
        extent: 1,
        naturalSize: { width: context.width, height },
        next: () => ({ end: 1, height, nodes: [node] }),
      },
      placement,
    );
  },
});
ownImagePreparation(visual.preparationOwner);
export const Image = visual.Component;
