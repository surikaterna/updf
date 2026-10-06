import { ownDataValue } from "./data.js";
import { fail } from "./error.js";
import type { OwnedResource } from "./owned-resource.js";
import type { OperationOptions, Policy } from "./policy.js";
import { resolveBindings } from "./resource-bindings.js";
import { ownTextService, type TextService } from "./text-service.js";

export interface ResolvedTextResources {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly service?: TextService | undefined;
}
export const emptyTextResources: ResolvedTextResources = Object.freeze({ bindings: new Map(), service: undefined });

export function resolveResources(options: OperationOptions, limits: Policy): ResolvedTextResources {
  const bindings = resolveBindings(options, limits);
  const text = ownDataValue(options, "text", "/options/text");
  return Object.freeze({ bindings, service: text === undefined ? undefined : ownTextService(text) });
}
export function textService(resources: ResolvedTextResources, path: string): TextService {
  if (!resources.service) fail("FONT_RESOURCE", path, "Text requires an explicit text service");
  return resources.service;
}
