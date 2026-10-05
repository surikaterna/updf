import { fontProvider } from "../fonts/provider.js";
import { alphaProvider } from "../painting/alpha.js";
import { documentResources } from "./document-resources.js";
import type { MeasuredPage } from "./plan.js";
import type { DocumentResources } from "./resource-types.js";

export function defaultResources(pages: readonly MeasuredPage[]): DocumentResources {
  return documentResources(pages, [fontProvider(), alphaProvider()]);
}
