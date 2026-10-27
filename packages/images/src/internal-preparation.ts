import {
  definePreparationService,
  readPreparationService,
  type PreparationContext,
  capturedVisualOwner,
  type CapturedVisualResource,
} from "@updf/layout/internal-preparation";
import type { OwnedResource } from "@updf/core/resources";
import type { ImageProps } from "./types.js";
import { isImagePreparation } from "./preparation-owner.js";
export function isImagePreparationCapture(capture: CapturedVisualResource): boolean {
  return isImagePreparation(capturedVisualOwner(capture));
}

type Resolver = (source: ImageProps["src"], sourcePath: string) => Promise<OwnedResource>;
export const imagePreparationService = definePreparationService<Resolver>();

/** Lookup only: no loader, codec, cache or asset implementation is retained by this leaf. */
export function resolveImageResource(context: PreparationContext, source: ImageProps["src"], sourcePath: string) {
  const resolve = readPreparationService(context, imagePreparationService, sourcePath);
  return resolve(source, sourcePath);
}
