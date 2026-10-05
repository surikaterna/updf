import { fail } from "../core/error.js";
import { ledger } from "../measurement/ledger.js";
import { validateParagraphs } from "../measurement/validate.js";
import { providerNode } from "./context.js";
import { dataRecord, snapshot } from "./data.js";
import { ownNode } from "./ownership.js";
import { ownInvocation } from "./progress.js";
import { recipeNode } from "./recipes.js";
import {
  type Component,
  type ComponentContext,
  Fragment,
  type Key,
  type NativeProps,
  type NativeTag,
  type VDOMChild,
  type VNode,
} from "./types.js";

export const nativeTags: readonly string[] = Object.freeze([
  "document",
  "page",
  "group",
  "text",
  "richText",
  "rect",
  "line",
  "path",
  "paintGroup",
]);

function isComponent<P extends object>(type: NativeTag | typeof Fragment | Component<P>): type is Component<P> {
  return typeof type === "function" && type !== Fragment;
}

export function createNode<P extends object>(
  type: NativeTag | typeof Fragment | Component<P>,
  props: P,
  key?: Key,
): VNode {
  if (key !== undefined && typeof key !== "string" && (typeof key !== "number" || !Number.isFinite(key))) {
    fail("TYPE", "/key", "Keys must be strings or finite numbers");
  }
  dataRecord(props, "/props");
  if ("key" in props) fail("KEY", "/props/key", "Key is constructor metadata, not a data prop");
  if (typeof type === "function") {
    const provider = providerNode(type, props, key);
    if (provider) return provider;
    const recipe = recipeNode(type, props, key);
    if (recipe) return recipe;
  }
  if (type === "richText") validateParagraphs(props.paragraphs, ledger(), "/props/paragraphs");
  const owned = snapshot<P>(props, "/props");
  const metadata = key === undefined ? {} : { key };
  if (type === Fragment) {
    dataRecord(owned, "/props");
    return ownNode({ kind: "native", tag: Fragment, props: owned, ...metadata });
  }
  if (isComponent(type)) {
    return ownInvocation(
      ownNode({ kind: "component", invoke: (context) => type(owned, context), ...metadata }),
      type,
      owned,
    );
  }
  if (typeof type !== "string" || !nativeTags.includes(type)) fail("TYPE", "/type", "Unsupported native VDOM type");
  dataRecord(owned, "/props");
  return ownNode({ kind: "native", tag: type, props: owned, ...metadata });
}

/**
 * Construct an owned frozen node from snapshotted data props; components execute only during lowering.
 * Key is separate metadata. Functions/accessors and unsupported data props are rejected.
 * @throws {DocumentError} For invalid constructors, keys or unsnapshotable props.
 */
export function h<Tag extends NativeTag>(type: Tag, props: NativeProps[Tag], key?: Key): VNode;
/** Construct a transparent owned fragment with snapshotted children. */
export function h(type: typeof Fragment, props: { readonly children?: VDOMChild }, key?: Key): VNode;
/** Construct a deferred trusted component invocation with snapshotted props. */
export function h<P extends object>(
  type: (props: Readonly<P>, context: ComponentContext) => VDOMChild,
  props: P,
  key?: Key,
): VNode;
/** Construct a deferred component invocation with a deeply readonly data view. */
export function h<P extends object>(type: Component<P>, props: P, key?: Key): VNode;
export function h<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode {
  return createNode(type, props, key);
}

/** Bind complete data props; expansion still happens afresh in the lower context. */
export function bind<P extends object>(component: Component<P>, props: P): Component<Record<never, never>> {
  const node = h(component, props);
  return () => node;
}
