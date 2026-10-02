import { jsx } from "./jsx-runtime.js";
import { type Component, Fragment, type Key, type NativeTag, type VNode } from "./vdom/types.js";

export type { JSX } from "./jsx-runtime.js";
export { Fragment };

export function jsxDEV<P extends object>(
  type: NativeTag | typeof Fragment | Component<P>,
  props: P,
  key?: Key,
  ...debugMetadata: readonly unknown[]
): VNode {
  void debugMetadata;
  return jsx(type, props, key);
}
