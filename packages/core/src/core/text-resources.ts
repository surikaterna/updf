import { dataRecord, ownDataValue, pointer } from "./data.js";
import { fail } from "./error.js";
import { isOwnedResource, type OwnedResource, ownedResourceBytes } from "./owned-resource.js";
import { checkLimit, type OperationOptions, type Policy } from "./policy.js";
import { ownTextService, type TextService } from "./text-service.js";

export interface ResolvedTextResources {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly service?: TextService | undefined;
}
export const emptyTextResources: ResolvedTextResources = Object.freeze({ bindings: new Map(), service: undefined });

export function resolveResources(options: OperationOptions, limits: Policy): ResolvedTextResources {
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
  const text = ownDataValue(options, "text", "/options/text");
  return Object.freeze({ bindings, service: text === undefined ? undefined : ownTextService(text) });
}
export function textService(resources: ResolvedTextResources, path: string): TextService {
  if (!resources.service) fail("FONT_RESOURCE", path, "Text requires an explicit text service");
  return resources.service;
}
