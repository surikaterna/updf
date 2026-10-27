import { array, fail, ownContentData, validateDataObject as record, type LayoutOperation } from "@updf/core/internal";
import { adapterName, registerAdapter } from "./adapter-ownership.js";
import { adapterSnapshot } from "./author-parts.js";
import type { InlineAdapterIdentity } from "./content-types.js";
import type {
  BlockAdapter,
  BlockAdapterDefinition,
  BlockAdapterIdentity,
  ExtensionBlock,
  Extensions,
  ReadonlyProps,
} from "./extension-types.js";

interface Definition {
  readonly name: string;
  readonly validate: (input: unknown) => unknown;
  readonly measure: BlockAdapterDefinition<unknown>["measure"];
}
const definitions = new WeakMap<object, Definition>();
const bindings = new WeakMap<object, ReadonlyMap<string, object>>();
const descriptors = new WeakMap<object, object>();
interface Installation {
  readonly central: Extensions | undefined;
  readonly locals: WeakMap<object, Extensions>;
}
let installations: WeakMap<LayoutOperation, Installation> | undefined;

/** Only this package's opaque sets contribute adapters; other operation features remain unrelated. */
export function resolveInstallation(operation: LayoutOperation, local?: Extensions): Extensions | undefined {
  validateExtensions(local);
  if (!operation.contributions?.length) return local;
  let installed = installations?.get(operation);
  if (!installed) {
    const sets = operation.contributions.filter((value) => bindings.has(value)) as Extensions[];
    installed = { central: combine(sets), locals: new WeakMap() };
    installations ??= new WeakMap();
    installations.set(operation, installed);
  }
  if (!local || !installed.central || local === installed.central) return installed.central ?? local;
  let combined = installed.locals.get(local);
  if (!combined) {
    combined = combine([installed.central, local])!;
    installed.locals.set(local, combined);
    installed.locals.set(combined, combined);
  }
  return combined;
}
function combine(sets: readonly Extensions[]): Extensions | undefined {
  if (sets.length < 2) return sets[0];
  const names = new Map<string, object>();
  for (const set of sets) {
    for (const [name, adapter] of bindings.get(set)!) {
      const previous = names.get(name);
      if (previous && previous !== adapter) fail("KEY", "/extensions", "Conflicting adapter identities for name");
      names.set(name, adapter);
    }
  }
  const result = ownContentData(Object.freeze({})) as unknown as Extensions;
  bindings.set(result, names);
  return result;
}
export function isExtensionBlock(value: unknown): value is ExtensionBlock {
  return !!value && typeof value === "object" && descriptors.has(value);
}
export function cloneExtension(block: ExtensionBlock): ExtensionBlock {
  const adapter = descriptors.get(block);
  if (!adapter) fail("TYPE", "/extension", "Expected owned extension");
  const copy = ownContentData(
    Object.freeze({ type: "extension" as const, props: block.props }),
  ) as unknown as ExtensionBlock;
  descriptors.set(copy, adapter);
  return copy;
}

/** Define a frozen identity with trusted synchronous callbacks; install that exact identity in createExtensions. */
export function defineBlockAdapter<P>(definition: BlockAdapterDefinition<P>): BlockAdapter<P> {
  record(definition, ["name", "validate", "measure"], "/adapter");
  if (typeof definition.name !== "string" || !/^[A-Za-z][A-Za-z0-9.-]*$/u.test(definition.name))
    fail("TYPE", "/adapter/name", "Expected a nonempty adapter identifier");
  if (typeof definition.validate !== "function" || typeof definition.measure !== "function")
    fail("TYPE", "/adapter", "Expected synchronous adapter callbacks");
  const adapter = Object.freeze({ name: definition.name }) as BlockAdapter<P>;
  registerAdapter(adapter, definition.name);
  definitions.set(
    adapter,
    Object.freeze({
      name: definition.name,
      validate: definition.validate,
      measure: definition.measure as (
        props: ReadonlyProps<unknown>,
        context: Parameters<typeof definition.measure>[1],
      ) => ReturnType<typeof definition.measure>,
    }),
  );
  return adapter;
}

/** Create a frozen local capability set; duplicate names/identities throw KEY, foreign identities reject. */
export function createExtensions(adapters: readonly (BlockAdapterIdentity | InlineAdapterIdentity)[]): Extensions {
  array(adapters, Number.MAX_SAFE_INTEGER, "/extensions");
  const names = new Map<string, object>();
  for (const adapter of adapters) {
    const name = adapterName(adapter);
    if (names.has(name)) fail("KEY", "/extensions", "Duplicate adapter name or identity");
    names.set(name, adapter);
  }
  const extensions = ownContentData(Object.freeze({})) as unknown as Extensions;
  bindings.set(extensions, names);
  return extensions;
}

/** Snapshot props into an owned frozen descriptor; adapter validation runs at measurement, not here. */
export function extension<P>(adapter: BlockAdapter<P>, props: P): ExtensionBlock {
  if (!definitions.has(adapter)) fail("TYPE", "/adapter", "Expected an owned block adapter");
  const block = ownContentData(
    Object.freeze({ type: "extension" as const, props: adapterSnapshot(props, "/props") }),
  ) as unknown as ExtensionBlock;
  descriptors.set(block, adapter);
  return block;
}

export function resolveExtension(block: object, extensions: Extensions | undefined, path: string): Definition {
  const adapter = descriptors.get(block);
  if (!adapter) fail("TYPE", path, "Expected an owned extension descriptor, not serialized measured data");
  const definition = definitions.get(adapter);
  const installed = extensions && bindings.get(extensions);
  if (!definition || !installed || installed.get(definition.name) !== adapter)
    fail("KEY", path, "The descriptor's adapter identity is not installed in this operation");
  return definition;
}

export function validateExtensions(extensions: Extensions | undefined): void {
  if (extensions !== undefined && !bindings.has(extensions)) fail("TYPE", "/extensions", "Expected owned extensions");
}
export function copyExtensions(extensions: Extensions): Extensions {
  validateExtensions(extensions);
  const copy = ownContentData(Object.freeze({})) as unknown as Extensions;
  bindings.set(copy, bindings.get(extensions)!);
  return copy;
}
export function requireInstalled(adapter: object, extensions: Extensions | undefined, path: string): void {
  const name = adapterName(adapter);
  if (!extensions || bindings.get(extensions)?.get(name) !== adapter)
    fail("KEY", path, "The descriptor's adapter identity is not installed in this operation");
}
