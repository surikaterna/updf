import { fail } from "../core/error.js";
import { snapshot } from "./data.js";
import { ownNode } from "./ownership.js";
import type { Component, ComponentContext, DeepReadonly, Key, VDOMChild, VNode } from "./types.js";

export interface SemanticRecipe {
  readonly identity: object;
  readonly props: Readonly<Record<string, unknown>>;
  readonly opaque?: boolean;
}
const components = new WeakMap<
  object,
  {
    identity: object;
    opaque: boolean;
    resolve?: (props: Record<string, unknown>, context: ComponentContext) => VDOMChild;
  }
>();
const recipes = new WeakMap<object, SemanticRecipe>();

/** Internal capability seam; core never imports an optional authoring package. */
export function semanticComponent<P extends object>(
  identity: object,
  opaque = false,
  resolve?: Component<P>,
): Component<P> {
  const component: Component<P> = () => fail("VDOM_HIERARCHY", "", "Semantic content requires a layout boundary");
  components.set(component, {
    identity,
    opaque,
    ...(resolve ? { resolve: (props, context) => resolve(props as DeepReadonly<P>, context) } : {}),
  });
  return component;
}
export function recipeNode(type: object, props: Record<string, unknown>, key?: Key): VNode | undefined {
  const definition = components.get(type);
  if (!definition) return undefined;
  const owned = snapshot(props, "/props");
  const node = ownNode({
    kind: "component",
    invoke: (context) =>
      definition.resolve
        ? definition.resolve(owned, context)
        : fail("VDOM_HIERARCHY", "", "Semantic content requires a layout boundary"),
    ...(key === undefined ? {} : { key }),
  });
  recipes.set(node, Object.freeze({ ...definition, props: owned }));
  return node;
}
export function semanticRecipe(node: object): SemanticRecipe | undefined {
  return recipes.get(node);
}
