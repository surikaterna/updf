import type { ContentHandle } from "../core/content-ownership.js";
import type { OperationOptions } from "../core/policy.js";
import type { TextMeasurement, TextMeasurementInput } from "../measurement/types.js";
import type { LineNode, PaintingGroupNode, PathNode, RectangleNode, RichTextNode, TextNode } from "../types.js";

/** Transparent child grouping; use through h or JSX to obtain an owned node. */
export const Fragment = (props: { readonly children?: VDOMChild }): VDOMChild => props.children;
/** Constructor metadata (finite numbers or strings), not a data prop or reconciliation API. */
export type Key = string | number;
/** Native vocabulary for fixed documents/pages/drawing, not HTML tags. */
export type NativeTag = keyof NativeProps;
/** Null/undefined/booleans are ignored; strings are legal only in text; numbers are never coerced. */
export type VDOMChild = VNode | string | null | undefined | boolean | readonly VDOMChild[];

type ReadonlyData<T> = T extends ContentHandle
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
/** Recursive readonly data view, preserving owned VNode/content-handle identities. */
export type DeepReadonly<T> = [T] extends [ContentHandle]
  ? T
  : [T] extends [VNode]
    ? T
    : [T] extends [VDOMChild]
      ? [VDOMChild] extends [T]
        ? VDOMChild
        : ReadonlyData<T>
      : ReadonlyData<T>;

/** Metadata only: components have no access to serialization or resource byte buffers. */
export interface ResourceMetadata {
  readonly id: string;
  readonly kind: string;
}
/** Operation-bound capabilities; retained measurement calls fail after lowering closes, including on error. */
export interface ComponentContext {
  readonly resources: readonly ResourceMetadata[];
  readonly measurement: { readonly measureText: (input: TextMeasurementInput) => TextMeasurement };
}
/** Trusted synchronous expansion over snapshotted data; async results are unsupported, host effects are not sandboxed. */
export type Component<Props extends object> = (props: DeepReadonly<Props>, context: ComponentContext) => VDOMChild;
/** Text child grammar uses VDOMChild but must expand to strings/transparent children, not drawings. */
export type TextChildren = VDOMChild;
/** Choose explicit text or children, never both; geometry follows TextNode. */
export type TextProps = Omit<TextNode, "type" | "text"> &
  ({ readonly text: string; readonly children?: never } | { readonly text?: never; readonly children: TextChildren });

/** Native props in top-left points; group x/y default to zero and translate children without adding a page. */
export interface NativeProps {
  document: { readonly version: 1; readonly children: VDOMChild };
  page: { readonly width: number; readonly height: number; readonly children: VDOMChild };
  group: { readonly x?: number; readonly y?: number; readonly children: VDOMChild };
  text: TextProps;
  richText: Omit<RichTextNode, "type">;
  rect: Omit<RectangleNode, "type">;
  line: Omit<LineNode, "type">;
  path: Omit<PathNode, "type">;
  paintGroup: Omit<PaintingGroupNode, "type" | "children"> & { readonly children: VDOMChild };
}

interface NodeMetadata {
  readonly key?: Key;
}
export interface NativeVNode extends NodeMetadata {
  readonly kind: "native";
  readonly tag: NativeTag | typeof Fragment;
  readonly props: Readonly<Record<string, unknown>>;
}
export interface ComponentVNode extends NodeMetadata {
  readonly kind: "component";
  readonly invoke: (context: ComponentContext) => VDOMChild;
}
export interface ExtensionVNode extends NodeMetadata {
  readonly kind: "extension";
  readonly definition: RegistryDefinition;
  readonly props: unknown;
}
export interface ProviderVNode extends NodeMetadata {
  readonly kind: "provider";
}
/** Owned immutable constructor result; structurally matching objects fail runtime ownership checks. */
export type VNode = NativeVNode | ComponentVNode | ExtensionVNode | ProviderVNode;

/** Instances are created by definePrimitive; installation is local to each lower call. */
export interface RegistryDefinition {
  readonly name: string;
  readonly expand: (props: unknown, context: ComponentContext) => VDOMChild;
}
/** Paired constructor and owned registry entry; install definition in each lower operation using Type. */
export interface Primitive<Props extends object> {
  readonly Type: Component<Props>;
  readonly definition: RegistryDefinition;
}
/** Shared policy plus per-operation extensions and metadata; neither enables arbitrary resource byte access. */
export interface LowerOptions extends OperationOptions {
  /** Defaults to empty; entries must come from definePrimitive and have unique names. */
  readonly registry?: readonly RegistryDefinition[];
  /** Defaults to empty; descriptive id/kind pairs only, not font/resource registration. */
  readonly resourceMetadata?: readonly ResourceMetadata[];
}
