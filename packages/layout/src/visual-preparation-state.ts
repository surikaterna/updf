import { fail, type LayoutOperation, type SemanticRecipe } from "@updf/core/internal";
import type { VisualSource } from "./visual-owner.js";

// Entries belong to occurrence recipes, never authored VNodes reused across scopes.
let resolved: WeakMap<SemanticRecipe, { source: VisualSource; operation: LayoutOperation }> | undefined;
let contents: WeakMap<object, import("./extension-types.js").ScopedContent> | undefined;
export function installVisualContent(props: object, content: import("./extension-types.js").ScopedContent): void {
  contents ??= new WeakMap();
  contents.set(props, content);
}
export function visualPreparedContent(props: object) {
  return contents?.get(props);
}
export function installVisualSource(recipe: SemanticRecipe, source: VisualSource, operation: LayoutOperation): void {
  resolved ??= new WeakMap();
  if (resolved.has(recipe)) fail("MEASUREMENT_CONTEXT", "", "Visual occurrence already resolved");
  resolved.set(recipe, { source, operation });
}
export function resolvedVisualSource(recipe: SemanticRecipe, operation: LayoutOperation): VisualSource | undefined {
  const entry = resolved?.get(recipe);
  if (!entry) return undefined;
  if (entry.operation !== operation) fail("MEASUREMENT_CONTEXT", "", "Foreign resolved visual occurrence");
  return entry.source;
}
