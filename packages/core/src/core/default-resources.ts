import { alphaProvider } from "../painting/alpha.js";
import { documentResources } from "./document-resources.js";
import type { OwnedResource } from "./owned-resource.js";
import type { MeasuredPage } from "./plan.js";
import type { DocumentResources, ResourceProvider } from "./resource-types.js";

export function defaultResources(
  pages: readonly MeasuredPage[],
  providers: readonly ResourceProvider[],
  bindings: ReadonlyMap<string, OwnedResource>,
): DocumentResources {
  return documentResources(pages, [...providers, alphaProvider()], bindings);
}
