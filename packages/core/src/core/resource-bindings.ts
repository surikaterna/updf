import { dataRecord, ownDataValue, pointer } from "./data.js";
import { fail } from "./error.js";
import { isOwnedResource, type OwnedResource, ownedResourceBytes } from "./owned-resource.js";
import { checkLimit, type Policy } from "./policy.js";

/** Capture all supplied bindings and charge each owned identity once, including unused resources. */
export function resolveBindings(
  options: { readonly resources?: Readonly<Record<string, OwnedResource>> },
  limits: Policy,
): ReadonlyMap<string, OwnedResource> {
  const bindings = new Map<string, OwnedResource>();
  const resources = ownDataValue(options, "resources", "/options/resources");
  if (resources !== undefined) {
    dataRecord(resources, "/resources");
    for (const id of Object.keys(resources)) {
      const path = `/resources/${pointer(id)}`;
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) fail("FONT_RESOURCE", path, "Invalid resource id");
      const resource = ownDataValue(resources, id, path);
      if (!isOwnedResource(resource)) fail("FONT_RESOURCE", path, "Expected owned resource");
      bindings.set(id, resource);
    }
  }
  let bytes = 0;
  const seen = new Set<OwnedResource>();
  for (const [id, resource] of bindings) {
    if (seen.has(resource)) continue;
    bytes = checkLimit(
      bytes + ownedResourceBytes(resource),
      limits.resourceBytes,
      `/resources/${pointer(id)}`,
      "Resource bytes",
    );
    seen.add(resource);
  }
  return bindings;
}
