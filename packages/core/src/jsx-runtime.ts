/**
 * `@updf/core/jsx-runtime`: automatic native JSX runtime; configure `jsxImportSource: "@updf/core"`.
 * Produces owned VDOM, not React elements. Lower the result before rendering.
 * @module
 */
import { createNode } from "./vdom/create.js";
import {
  type Component,
  type ComponentContext,
  Fragment,
  type Key,
  type NativeProps,
  type NativeTag,
  type VDOMChild,
  type VNode,
} from "./vdom/types.js";

export { Fragment };

/** Automatic-runtime component constructor with the snapshot/ownership contract of vdom h. */
export function jsx<P extends object>(
  type: (props: Readonly<P>, context: ComponentContext) => VDOMChild,
  props: P,
  key?: Key,
): VNode;
/** Automatic-runtime native/fragment constructor; key is metadata separate from data props. */
export function jsx<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode;
export function jsx<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode {
  return createNode(type, props, key);
}
/** Multiple-static-children alias of jsx; it uses the same ownership and validation behavior. */
export const jsxs = jsx;

// Local namespace for jsxImportSource; it never augments React/global JSX.
/** Local compiler typing for native TSX; does not augment global or React JSX. */
export declare namespace JSX {
  export type Element = VNode;
  export type ElementType = NativeTag | typeof Fragment | ((props: never, context: ComponentContext) => VDOMChild);
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  export interface IntrinsicAttributes {
    key?: Key;
  }
  export type IntrinsicElements = NativeProps;
}
