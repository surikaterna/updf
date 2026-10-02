import { fail } from "../core/error.js";
import { nativeTags } from "./create.js";
import { dataArray, dataRecord, keys, snapshot } from "./data.js";
import { ownNode } from "./ownership.js";
import type {
  Component,
  ComponentContext,
  DeepReadonly,
  Primitive,
  RegistryDefinition,
  ResourceMetadata,
  VDOMChild,
} from "./types.js";

const definitions = new WeakSet<object>();

export function definePrimitive<P extends object>(
  name: string,
  validate: (props: unknown) => props is DeepReadonly<P>,
  expand: (props: DeepReadonly<P>, context: ComponentContext) => VDOMChild,
): Primitive<P> {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || nativeTags.includes(name.toLowerCase())) {
    fail("VDOM_REGISTRY", "/registry", "Primitive names must be uppercase identifiers and cannot override natives");
  }
  const definition: RegistryDefinition = Object.freeze({
    name,
    expand: (props: unknown, context: ComponentContext) => {
      if (!validate(props)) fail("TYPE", "/props", `Invalid ${name} props`);
      return expand(props, context);
    },
  });
  definitions.add(definition);
  const Type: Component<P> = (props) => {
    if ("key" in props) fail("KEY", "/props/key", "Key is constructor metadata, not a data prop");
    return ownNode({ kind: "extension", definition, props: snapshot(props, "/props") });
  };
  return Object.freeze({ definition, Type });
}

function isDefinition(entry: unknown): entry is RegistryDefinition {
  return typeof entry === "object" && entry !== null && definitions.has(entry);
}

export function install(entries: unknown): ReadonlySet<RegistryDefinition> {
  dataArray(entries, "/options/registry");
  const installed = new Set<RegistryDefinition>();
  const names = new Set<string>();
  for (const entry of entries) {
    if (!isDefinition(entry)) fail("VDOM_REGISTRY", "/options/registry", "Unrecognized primitive definition");
    if (names.has(entry.name)) fail("VDOM_REGISTRY", "/options/registry", `Duplicate primitive ${entry.name}`);
    names.add(entry.name);
    installed.add(entry);
  }
  return installed;
}

export function context(resources: unknown): ComponentContext {
  dataArray(resources, "/options/resourceMetadata");
  const metadata: ResourceMetadata[] = [];
  for (let i = 0; i < resources.length; i++) {
    const item: unknown = resources[i];
    dataRecord(item, `/options/resourceMetadata/${i}`);
    keys(item, ["id", "kind"], `/options/resourceMetadata/${i}`);
    if (typeof item.id !== "string" || typeof item.kind !== "string")
      fail("TYPE", "/options/resourceMetadata", "Expected id/kind metadata strings");
    metadata.push({ id: item.id, kind: item.kind });
  }
  return snapshot({ resources: metadata }, "/options/resourceMetadata");
}
