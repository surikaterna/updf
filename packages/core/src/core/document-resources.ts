import type { PdfRef, PdfWriter } from "./pdf-writer.js";
import type { MeasuredPage } from "./plan.js";
import type {
  DocumentResources,
  PageResources,
  Resource,
  ResourceCollection,
  ResourcePhase,
  ResourceProvider,
  ResourceSlot,
} from "./resource-types.js";
import { descendants } from "./traversal.js";

type Bindings = Map<object, Map<object, Resource<unknown>>>;

export function documentResources(
  pages: readonly MeasuredPage[],
  providers: readonly ResourceProvider[],
): DocumentResources {
  const collection = new Collection(providers);
  const bindings = new Map<MeasuredPage, Bindings>();
  for (const provider of providers) provider.initialize?.(collection);
  for (const page of pages) {
    const current = bindings.get(page) ?? new Map();
    bindings.set(page, current);
    collection.current = current;
    for (const node of descendants(page.children, (node) => (node.type === "paintGroup" ? node.children : [])))
      for (const provider of providers) provider.collect(node, collection);
  }
  collection.closed = true;
  const resources = [...collection.interned.values()].flatMap((entries) => [...entries.values()]);
  return Object.freeze({
    page(page: MeasuredPage): PageResources {
      const selected = bindings.get(page);
      if (!selected) throw new Error("Foreign resource page");
      return Object.freeze({
        resolve<T>(site: object, slot: ResourceSlot<T>): Resource<T> {
          const resource = selected.get(site)?.get(slot);
          if (!resource) throw new Error("Missing page resource binding");
          return resource as Resource<T>;
        },
      });
    },
    open: (writer: PdfWriter) => reservations(writer, resources),
  });
}

class Collection implements ResourceCollection {
  readonly interned: Map<object, Map<unknown, Resource<unknown>>>;
  private readonly owned = new Map<Resource<unknown>, object>();
  current: Bindings | undefined;
  closed = false;

  constructor(providers: readonly ResourceProvider[]) {
    this.interned = new Map(providers.map((provider) => [provider.slot, new Map()]));
    if (this.interned.size !== providers.length) throw new Error("Duplicate resource slot");
  }

  intern<T>(slot: ResourceSlot<T>, identity: unknown, create: () => Resource<T>): Resource<T> {
    if (this.closed) throw new Error("Resource collection is closed");
    const entries = this.interned.get(slot);
    if (!entries) throw new Error("Foreign resource slot");
    const existing = entries.get(identity);
    // Each bucket and binding can only be populated through its typed slot.
    if (existing) return existing as Resource<T>;
    const resource = Object.freeze(create());
    entries.set(identity, resource);
    this.owned.set(resource, slot);
    return resource;
  }

  bind<T>(site: object, slot: ResourceSlot<T>, resource: Resource<T>): void {
    if (this.closed) throw new Error("Resource collection is closed");
    if (!this.current || this.owned.get(resource) !== slot) throw new Error("Foreign resource binding");
    let slots = this.current.get(site);
    if (!slots) {
      slots = new Map();
      this.current.set(site, slots);
    }
    const previous = slots.get(slot);
    if (previous && previous !== resource) throw new Error("Conflicting resource binding");
    slots.set(slot, resource);
  }
}

function reservations(writer: PdfWriter, resources: readonly Resource<unknown>[]) {
  const dictionary: Record<string, Record<string, PdfRef>> = Object.create(null);
  const definitions = new Map<ResourcePhase, (() => void)[]>();
  return {
    dictionary,
    reserve(phase: ResourcePhase): void {
      if (definitions.has(phase)) throw new Error("Resources already reserved");
      const pending: (() => void)[] = [];
      definitions.set(phase, pending);
      for (const resource of resources) {
        if (resource.phase !== phase) continue;
        let category = dictionary[resource.category];
        if (!category) {
          category = Object.create(null) as Record<string, PdfRef>;
          dictionary[resource.category] = category;
        }
        if (Object.hasOwn(category, resource.key)) throw new Error("Conflicting resource key");
        const reserved = resource.reserve(writer);
        category[resource.key] = reserved.ref;
        pending.push(reserved.define);
      }
    },
    define(phase: ResourcePhase): void {
      const pending = definitions.get(phase);
      if (!pending) throw new Error("Resources not reserved");
      for (const define of pending) define();
    },
  };
}
