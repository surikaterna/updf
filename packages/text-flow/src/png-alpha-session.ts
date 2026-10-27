import { DocumentError, fail } from "@updf/core/internal";
import type { OwnedResource } from "@updf/core/resources";
import { resolveImageResource } from "@updf/images/internal-preparation";
import type { PreparationContext } from "@updf/layout/internal-preparation";
import { pngAlphaInfo, type PngResource } from "@updf/png/alpha";
import { preparePngShape } from "./png-shape.js";
import { geometryBytes, ownAlphaGeometry, type AlphaPolicy } from "./png-alpha-geometry.js";

export interface AlphaRequest {
  readonly path: string;
  readonly source: { readonly kind: "url"; readonly src: string };
  readonly threshold: number;
  readonly capture: import("@updf/layout/internal-preparation").CapturedVisualResource;
}
const negativeZero = Object.freeze({});
export function alphaSession(policy: AlphaPolicy, context: PreparationContext) {
  const cache = new Map<OwnedResource, Map<number | object, OwnedResource>>();
  let pixels = policy.maxPixels,
    commands = policy.maxCommands,
    active = true;
  const check = () => {
    context.check();
    if (!active) fail("PHASE", "/pngAlphaShapes", "PNG shape session closed");
  };
  return {
    async resolve(request: AlphaRequest): Promise<OwnedResource> {
      const { path, threshold } = request;
      check();
      // Service lookup and URI policy happen even when this exact shape is already prepared.
      const image = await resolveImageResource(context, request.source, path);
      check();
      context.retain(image, path);
      try {
        const info = pngAlphaInfo(image as PngResource);
        const key = Object.is(threshold, -0) ? negativeZero : threshold;
        const hit = cache.get(image)?.get(key);
        if (hit) return hit;
        const allowance = pixels;
        if (info.width * info.height > pixels || commands <= 0)
          fail("LIMIT", path, "Cumulative PNG shape budget exhausted");
        pixels -= info.width * info.height;
        const shape = await preparePngShape(image as PngResource, {
          maxPixels: allowance,
          maxCommands: commands,
          shapeImageThreshold: threshold,
          ...(context.signal ? { signal: context.signal } : {}),
        });
        check();
        commands -= shape.kind === "empty" ? 0 : shape.commands.length;
        if (geometryBytes(shape) > context.remaining())
          fail("LIMIT", path, "PNG geometry exceeds retained resource bytes");
        const resource = ownAlphaGeometry(shape, policy);
        return cacheGeometry(cache, image, key, resource);
      } catch (error) {
        throw shapeError(error, path);
      }
    },
    close() {
      active = false;
      cache.clear();
    },
  };
}
function shapeError(error: unknown, path: string): unknown {
  if (!(error instanceof DocumentError)) return error;
  const d = error.diagnostics[0]!;
  return new DocumentError(d.code, d.path.startsWith(path) ? d.path : path, d.message, d);
}
function cacheGeometry(
  cache: Map<OwnedResource, Map<number | object, OwnedResource>>,
  image: OwnedResource,
  key: number | object,
  resource: OwnedResource,
) {
  const entries = cache.get(image) ?? new Map<number | object, OwnedResource>();
  entries.set(key, resource);
  cache.set(image, entries);
  return resource;
}
