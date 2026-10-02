import { fail } from "../core/error.js";
import { dataRecord, snapshot } from "./data.js";
import { ownNode } from "./ownership.js";
import {
  type Component,
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
  const owned = snapshot(props, "/props");
  const metadata = key === undefined ? {} : { key };
  if (type === Fragment) {
    dataRecord(owned, "/props");
    return ownNode({ kind: "native", tag: Fragment, props: owned, ...metadata });
  }
  if (isComponent(type)) {
    return ownNode({ kind: "component", invoke: (context) => type(owned, context), ...metadata });
  }
  if (typeof type !== "string" || !nativeTags.includes(type)) fail("TYPE", "/type", "Unsupported native VDOM type");
  dataRecord(owned, "/props");
  return ownNode({ kind: "native", tag: type, props: owned, ...metadata });
}

export function h<Tag extends NativeTag>(type: Tag, props: NativeProps[Tag], key?: Key): VNode;
export function h(type: typeof Fragment, props: { readonly children?: VDOMChild }, key?: Key): VNode;
export function h<P extends object>(type: Component<P>, props: P, key?: Key): VNode;
export function h<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode {
  return createNode(type, props, key);
}

/** Bind complete data props; expansion still happens afresh in the lower context. */
export function bind<P extends object>(component: Component<P>, props: P): Component<Record<never, never>> {
  const node = h(component, props);
  return () => node;
}
