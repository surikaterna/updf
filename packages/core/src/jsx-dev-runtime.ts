/**
 * `@updf/core/jsx-dev-runtime`: compiler-selected development counterpart of the native JSX runtime.
 * Debug metadata is accepted but ignored; no React development instrumentation is installed.
 * @module
 */
import { jsx } from "./jsx-runtime.js";
import { type Component, Fragment, type Key, type NativeTag, type VNode } from "./vdom/types.js";

export type { JSX } from "./jsx-runtime.js";
export { Fragment };

/** Development constructor with jsx's owned snapshot contract; debug metadata does not affect output. */
export function jsxDEV<P extends object>(
  type: NativeTag | typeof Fragment | Component<P>,
  props: P,
  key?: Key,
  ...debugMetadata: readonly unknown[]
): VNode {
  void debugMetadata;
  return jsx(type, props, key);
}
