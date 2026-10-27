import { fail } from "@updf/core/internal";
import { createOwnedResource, type OwnedResource } from "@updf/core/resources";
import type { PngShape } from "./png-shape.js";

export interface AlphaPolicy {
  readonly maxPixels: number;
  readonly maxCommands: number;
}
const geometries = new WeakMap<object, { readonly shape: PngShape; readonly policy: AlphaPolicy }>();

/** Logical payload: version/kind tags, five Float64 scalars, then one tag and Float64 coordinates per command.
 * This is retained resource accounting, not a claim about JavaScript peak heap usage. */
export function geometryBytes(shape: PngShape): number {
  return (
    42 +
    (shape.kind === "empty"
      ? 0
      : shape.commands.reduce((n, c) => n + (c.type === "close" ? 1 : c.type === "cubic" ? 49 : 17), 0))
  );
}
export function ownAlphaGeometry(shape: PngShape, policy: AlphaPolicy): OwnedResource {
  const resource = createOwnedResource({ shape, policy }, { byteLength: geometryBytes(shape) });
  geometries.set(resource, { shape: resource.metadata.shape, policy });
  return resource;
}
export function readAlphaGeometry(resource: OwnedResource, policy: AlphaPolicy, path: string): PngShape {
  const record = geometries.get(resource);
  if (!record || record.policy !== policy)
    fail("MEASUREMENT_CONTEXT", path, "Expected this handler's owned PNG geometry");
  return record.shape;
}
