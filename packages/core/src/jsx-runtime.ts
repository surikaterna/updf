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

export function jsx<P extends object>(
  type: (props: Readonly<P>, context: ComponentContext) => VDOMChild,
  props: P,
  key?: Key,
): VNode;
export function jsx<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode;
export function jsx<P extends object>(type: NativeTag | typeof Fragment | Component<P>, props: P, key?: Key): VNode {
  return createNode(type, props, key);
}
export const jsxs = jsx;

// Local namespace for jsxImportSource; it never augments React/global JSX.
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
