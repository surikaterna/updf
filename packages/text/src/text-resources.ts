import { dataRecord, fail, ownDataValue } from "@updf/core/internal";
import type { OwnedResource, TextRuntime, TextServiceContext } from "@updf/core/resources";
import { intrinsicLineMetrics, intrinsicMetrics } from "./runtime-output.js";

export interface ResolvedTextResources {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly runtime: TextRuntime;
  readonly defaultFont?: string | undefined;
}
export function ownRuntime(value: unknown): TextRuntime {
  const path = "/text/runtime";
  dataRecord(value, path);
  const callbacks = Object.create(null) as TextRuntime;
  for (const key of [
    "validateResource",
    "validateText",
    "fixedPolicy",
    "lineMetrics",
    "measure",
    "joinRuns",
  ] as const) {
    const callback = ownDataValue(value, key, `${path}/${key}`);
    if (typeof callback !== "function") fail("FONT_RESOURCE", `${path}/${key}`, "Missing text runtime capability");
    const bound = callback.bind(value);
    const captured =
      key === "measure"
        ? (...args: Parameters<TextRuntime["measure"]>) => intrinsicMetrics(bound(...args), args[4])
        : key === "lineMetrics"
          ? (...args: Parameters<TextRuntime["lineMetrics"]>) => intrinsicLineMetrics(bound(...args), args[2])
          : bound;
    Object.defineProperty(callbacks, key, { value: captured, enumerable: true });
  }
  return Object.freeze(callbacks);
}
export function resolved(
  context: TextServiceContext,
  runtime: TextRuntime,
  defaultFont: string | undefined,
): ResolvedTextResources {
  return { bindings: context.bindings, runtime, defaultFont };
}
export function textRuntime(resources: ResolvedTextResources, path: string): TextRuntime {
  if (!resources.runtime) fail("FONT_RESOURCE", path, "Text requires an explicit runtime");
  return resources.runtime;
}
export function fontId(id: unknown, resources: ResolvedTextResources, path: string): string {
  const key = id ?? resources.defaultFont;
  if (typeof key !== "string") fail("FONT_RESOURCE", path, "Text requires a font reference or explicit defaultFont");
  return key;
}
export function selectedFont(id: unknown, resources: ResolvedTextResources, path: string): OwnedResource {
  const key = fontId(id, resources, path);
  const resource = resources.bindings.get(key);
  if (!resource) fail("FONT_RESOURCE", path, `Unknown text resource ${key}`);
  resources.runtime.validateResource(resource, path);
  return resource;
}
export function validateCharacters(
  text: string,
  resource: OwnedResource,
  resources: ResolvedTextResources,
  path: string,
): void {
  resources.runtime.validateText(resource, text, path);
}
