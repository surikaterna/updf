import { fail } from "./error.js";
import { name, value } from "./pdf-values.js";
import type { Resource, ResourceDefinition } from "./resource-types.js";

const fields = ["category", "phase", "payload", "reserve"] as const;

export function resourceDefinition<T>(input: ResourceDefinition<T>): ResourceDefinition<T> {
  if (!input || typeof input !== "object" || "key" in input)
    fail("RESOURCE", "/resources", "Expected a key-free resource definition");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(descriptors).some((key) => !fields.includes(key as (typeof fields)[number])))
    fail("RESOURCE", "/resources", "Unexpected resource definition field");
  for (const field of fields) {
    if (!Object.hasOwn(descriptors, field) || !descriptors[field] || !("value" in descriptors[field]))
      fail("RESOURCE", "/resources", "Expected own data resource definition fields");
  }
  const category: unknown = descriptors.category?.value;
  const phase: unknown = descriptors.phase?.value;
  const reserve: unknown = descriptors.reserve?.value;
  if (typeof category !== "string" || (phase !== "bootstrap" && phase !== "content") || typeof reserve !== "function")
    fail("RESOURCE", "/resources", "Invalid resource definition");
  try {
    value(name(category));
  } catch {
    fail("RESOURCE", "/resources", "Expected PDF name bytes for resource category");
  }
  return {
    category,
    phase,
    payload: descriptors.payload?.value as T,
    reserve: reserve as ResourceDefinition<T>["reserve"],
  };
}

export function namedResource<T>(definition: ResourceDefinition<T>, sequence: number): Resource<T> {
  const { category, phase, payload, reserve } = definition;
  const prefix = category === "Font" ? "F" : category === "ExtGState" ? "GS" : category === "XObject" ? "X" : "R";
  return Object.freeze({ category, phase, payload, reserve, key: `${prefix}${sequence}` });
}
