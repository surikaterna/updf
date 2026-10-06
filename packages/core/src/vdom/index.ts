/**
 * `@updf/core/vdom`: owned immutable native trees and synchronous trusted components.
 * Lower trees to fixed-page data before rendering; this is not React or a code sandbox.
 * @module
 */
export type { Context, ReadContext } from "./context.js";
export { createContext, useContext } from "./context.js";
export { bind, h } from "./create.js";
export { lower } from "./lower.js";
export { definePrimitive } from "./registry.js";
export type {
  Component,
  ComponentContext,
  DeepReadonly,
  Key,
  LowerOptions,
  NativeProps,
  NativeTag,
  Primitive,
  RegistryDefinition,
  ResourceMetadata,
  VDOMChild,
  VNode,
} from "./types.js";
export { Fragment } from "./types.js";
