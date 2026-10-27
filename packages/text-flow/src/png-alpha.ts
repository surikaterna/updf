import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import { isImagePreparationCapture } from "@updf/images/internal-preparation";
import {
  attachParticipationPreparationResource,
  replaceParticipationData,
  type CapturedVisualResource,
  type PreparationCaptureContext,
} from "@updf/layout/internal-preparation";
import { defineHandler, type ShapeHandler, type SyntaxHandler, type ResourceShapeHandler } from "./handlers.js";
import type { ManualMarker } from "./component-owner.js";
import { readAlphaGeometry, type AlphaPolicy } from "./png-alpha-geometry.js";
import { alphaProjection } from "./png-alpha-projection.js";
import { alphaSession, type AlphaRequest } from "./png-alpha-session.js";

export interface PngAlphaShapesOptions {
  readonly maxPixels?: number;
  readonly maxCommands?: number;
}
function limit(options: Record<string, unknown>, key: string, ceiling: number): number {
  const n = Object.hasOwn(options, key) ? ownDataValue(options, key, `/pngAlphaShapes/${key}`) : ceiling;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0 || n > ceiling)
    fail("VALUE", `/pngAlphaShapes/${key}`, `Expected positive safe integer at most ${ceiling}`);
  return n;
}
function request(
  capture: CapturedVisualResource | undefined,
  context: PreparationCaptureContext | undefined,
  syntax: SyntaxHandler | undefined,
  path: string,
): AlphaRequest | undefined {
  if (!capture) fail("PHASE", path, "PNG shape requires owned participation capture");
  const marker = capture.data as ManualMarker;
  let shape = marker.shape;
  if (typeof shape === "string") {
    if (!syntax) fail("MEASUREMENT_CONTEXT", `${path}/style/shapeOutside`, "String shapes require shapeSyntax()");
    if (!context) fail("PHASE", path, "String shape capture has sealed");
    const at = `${path}/style/shapeOutside`;
    shape = syntax(shape, (count) => context.chargeSourceWork(count, at), at);
  }
  if (!shape || shape.kind !== "url") return undefined;
  if (marker.visual || (ownDataValue(marker, "reference", path) === "visual" && !isImagePreparationCapture(capture)))
    fail("VALUE", `${path}/style/shapeOutside`, "PNG URL masks support Image and Block, not Path visuals");
  return Object.freeze({ source: shape, threshold: marker.threshold, path: `${path}/style/shapeOutside`, capture });
}
/** Selected integration leaf. Loading, format handlers and caching remain independently selected. */
export function pngAlphaShapes(options?: PngAlphaShapesOptions): ShapeHandler {
  const input = arguments.length === 0 ? {} : options;
  validateDataObject(input, ["maxPixels", "maxCommands"], "/pngAlphaShapes");
  const policy: AlphaPolicy = Object.freeze({
    maxPixels: limit(input, "maxPixels", 16_000_000),
    maxCommands: limit(input, "maxCommands", 4096),
  });
  return defineHandler({
    kind: "resource",
    resolve: Object.freeze<ResourceShapeHandler>({
      contribution: (owner, syntax) =>
        attachParticipationPreparationResource<AlphaRequest>(owner, {
          identity: owner,
          slot: "participation-data",
          capture: (_props, path, capture, context) => request(capture, context, syntax, path),
          resolve: async () => fail("PHASE", "/pngAlphaShapes", "PNG shape preparation session is not active"),
          replace: (request, resource, id) =>
            replaceParticipationData(
              request.capture,
              resource,
              id,
              Object.freeze({ ...request.capture.data, shape: undefined, preparedShapeResource: resource }),
            ),
          session: (context) => alphaSession(policy, context),
        }),
      query(resource, source, prepared, context, charge, path) {
        // Authenticate before reading any metadata; the caller already checked operation binding.
        const shape = readAlphaGeometry(resource, policy, path);
        const marker = source.data as ManualMarker;
        const reference =
          ownDataValue(marker, "reference", path) === "visual"
            ? context.reference(source, prepared)
            : { x: 0, y: 0, ...prepared.naturalSize };
        return alphaProjection(
          shape,
          reference,
          prepared.naturalSize.width,
          (source.data as ManualMarker).side,
          charge,
          path,
        );
      },
    }),
  });
}
