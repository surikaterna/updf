import { defineOperationExtension, fail } from "@updf/core/internal";
import type { OperationExtension } from "@updf/core/resources";
import {
  attachPreparationResource,
  replaceVisualResource,
  type CapturedVisualResource,
} from "@updf/layout/internal-preparation";
import { captureOptions, type ImagesOptions } from "./load-options.js";
import { imageSession } from "./load-session.js";
import { sourceUrl } from "./source.js";
import type { ImageProps } from "./types.js";
import { imageCapability, imagesFeature, visual } from "./visual.js";
import { imagePreparationService } from "./internal-preparation.js";
import { occurrenceError } from "./source-error.js";

export { createAssetLoader } from "@updf/assets";
export type { ImagesOptions } from "./load-options.js";
export type { ImageFormatHandler } from "./format-handler.js";
interface Request {
  readonly path: string;
  readonly source: ImageProps["src"];
  readonly visual: CapturedVisualResource;
}

/** Explicit URL preparation; configuration is immutable and session state is per render. */
export function images(options: ImagesOptions): OperationExtension {
  if (arguments.length !== 1) fail("TYPE", "/images", "URL images requires one explicit configuration");
  const config = captureOptions(options);
  const contribution = attachPreparationResource<Request>(visual.adapters, {
    identity: visual.preparationOwner,
    slot: "visual-resource",
    service: imagePreparationService,
    capture(_props, path, capture) {
      if (!capture) fail("PHASE", path, "Image preparation requires owned visual capture");
      if (sourceUrl(capture.visual.src as ImageProps["src"]) === undefined) return undefined;
      return Object.freeze({ path: `${path}/src`, source: capture.visual.src as ImageProps["src"], visual: capture });
    },
    resolve: async () => fail("PHASE", "/images", "Image preparation session is not active"),
    replace(request, resource, id) {
      return replaceVisualResource(request.visual, resource, id);
    },
    session(context) {
      const session = imageSession(config, context);
      const resolve = async (source: ImageProps["src"], path: string) => {
        try {
          return await session.resolve(source);
        } catch (error) {
          throw occurrenceError(error, path);
        }
      };
      return {
        service: resolve,
        resolve: (request: Request) => resolve(request.source, request.path),
        close: session.close,
      };
    },
  });
  return defineOperationExtension(imagesFeature, imageCapability, contribution);
}
