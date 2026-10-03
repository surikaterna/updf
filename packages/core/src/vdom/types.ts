import type { ContentHandle } from "../core/content-ownership.js";
import type { OperationOptions } from "../core/policy.js";
import type { TextMeasurement, TextMeasurementInput } from "../measurement/types.js";
import type { LineNode, PaintingGroupNode, PathNode, RectangleNode, RichTextNode, TextNode } from "../types.js";

export const Fragment = (props: { readonly children?: VDOMChild }): VDOMChild => props.children;
export type Key = string | number;
export type NativeTag = keyof NativeProps;
export type VDOMChild = VNode | string | null | undefined | boolean | readonly VDOMChild[];

type ReadonlyData<T> = T extends ContentHandle
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
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
export interface ComponentContext {
  readonly resources: readonly ResourceMetadata[];
  readonly measurement: { readonly measureText: (input: TextMeasurementInput) => TextMeasurement };
}
export type Component<Props extends object> = (props: DeepReadonly<Props>, context: ComponentContext) => VDOMChild;
export type TextChildren = VDOMChild;
export type TextProps = Omit<TextNode, "type" | "text"> &
  ({ readonly text: string; readonly children?: never } | { readonly text?: never; readonly children: TextChildren });

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
export type VNode = NativeVNode | ComponentVNode | ExtensionVNode | ProviderVNode;

/** Instances are created by definePrimitive; installation is local to each lower call. */
export interface RegistryDefinition {
  readonly name: string;
  readonly expand: (props: unknown, context: ComponentContext) => VDOMChild;
}
export interface Primitive<Props extends object> {
  readonly Type: Component<Props>;
  readonly definition: RegistryDefinition;
}
export interface LowerOptions extends OperationOptions {
  readonly registry?: readonly RegistryDefinition[];
  readonly resourceMetadata?: readonly ResourceMetadata[];
}
