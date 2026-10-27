import type { BlockComponent, ContentBlockProps } from "./content-types.js";
import type { OwnedResource } from "@updf/core/resources";

declare const visualBrand: unique symbol;
/** Private sibling-package capability; ordinary functions cannot substitute for an owned visual. */
export type OwnedVisualComponent<P extends object> = BlockComponent<P> & {
  readonly [visualBrand]: (props: P) => P;
};
export type VisualCapture = (input: Readonly<Record<string, unknown>>, path: string) => ContentBlockProps;
let definitions: WeakMap<object, VisualCapture> | undefined;
const semanticAdapters = new WeakMap<object, object>();
const preparationOwners = new WeakMap<object, VisualPreparationOwner>();
const components = new WeakSet<object>();
export function ownedVisualComponent(identity: object): boolean {
  return components.has(identity);
}
export interface VisualPreparationOwner {
  readonly identity: object;
  readonly capture: (input: Readonly<Record<string, unknown>>, path: string) => VisualSource;
  readonly replace: (source: VisualSource, resource: OwnedResource, id: string) => VisualSource;
}
export interface VisualSource {
  readonly props: ContentBlockProps;
  readonly data?: object;
  readonly body?: import("./content-types.js").BlockContent;
}
export function associateVisualAdapter(identity: object, adapter: object): void {
  semanticAdapters.set(adapter, identity);
}
export function visualPreparationOwner(identity: object): VisualPreparationOwner | undefined {
  return preparationOwners.get(identity);
}
export function associateVisualPreparation(identity: object, owner: VisualPreparationOwner): void {
  preparationOwners.set(identity, owner);
}

export function ownVisual<P extends object>(
  component: BlockComponent<P>,
  adapter: object,
  capture: VisualCapture,
  replace: VisualPreparationOwner["replace"],
): OwnedVisualComponent<P> {
  definitions ??= new WeakMap();
  definitions.set(component, capture);
  components.add(component);
  definitions.set(adapter, capture);
  const owner = Object.freeze({
    identity: Object.freeze({}),
    capture: (input: Readonly<Record<string, unknown>>, path: string) => ({ props: capture(input, path) }),
    replace,
  });
  for (const identity of [component, adapter, semanticAdapters.get(adapter)!]) preparationOwners.set(identity, owner);
  preparationOwners.set(owner.identity, owner);
  return component as OwnedVisualComponent<P>;
}
export function visualCapture(identity: object): VisualCapture | undefined {
  return definitions?.get(identity);
}
