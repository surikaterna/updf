import { fail } from "./error.js";
import { isOwnedResource, type OwnedResource, ownedResourceBytes } from "./owned-resource.js";
import { checkLimit, type Policy } from "./policy.js";

function readonlyBindings(map: Map<string, OwnedResource>): ReadonlyMap<string, OwnedResource> {
  const view: ReadonlyMap<string, OwnedResource> = Object.freeze({
    get size() {
      return map.size;
    },
    get: (key: string) => map.get(key),
    has: (key: string) => map.has(key),
    entries: () => map.entries(),
    keys: () => map.keys(),
    values: () => map.values(),
    [Symbol.iterator]: () => map[Symbol.iterator](),
    forEach: (
      visit: (value: OwnedResource, key: string, map: ReadonlyMap<string, OwnedResource>) => void,
      self?: unknown,
    ) => {
      map.forEach((value, key) => {
        visit.call(self, value, key, view);
      });
    },
  });
  return view;
}

/** Initial capabilities keep their snapshot; only sealing publishes the appended view. */
export function preparationBindings(
  initial: ReadonlyMap<string, OwnedResource>,
  limits: Policy,
  reserved: readonly string[],
) {
  const pending = new Map(initial);
  const identities = new Map<OwnedResource, string>();
  let bytes = 0,
    sequence = 0;
  for (const [id, resource] of initial) {
    if (identities.has(resource)) continue;
    identities.set(resource, id);
    bytes += ownedResourceBytes(resource);
  }
  const names = new Set([...initial.keys(), ...reserved]);
  let current = readonlyBindings(new Map(initial));
  return Object.freeze({
    remaining: () => limits.resourceBytes - bytes,
    get bindings() {
      return current;
    },
    append(resource: OwnedResource, path: string) {
      if (!isOwnedResource(resource)) fail("RESOURCE", path, "Expected owned prepared resource");
      const existing = identities.get(resource);
      if (existing !== undefined) return existing;
      bytes = checkLimit(bytes + ownedResourceBytes(resource), limits.resourceBytes, path, "Resource bytes");
      let id: string;
      do {
        id = `Prepared${sequence++}`;
      } while (names.has(id));
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) fail("RESOURCE", path, "Generated resource id exhausted");
      names.add(id);
      identities.set(resource, id);
      pending.set(id, resource);
      return id;
    },
    seal() {
      current = readonlyBindings(new Map(pending));
      return Object.freeze(Object.fromEntries(pending));
    },
  });
}
