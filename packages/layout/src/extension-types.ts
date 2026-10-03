import type { NodeDefinition } from "@updf/core";
import type { ContentHandle } from "@updf/core/internal";
import type { TextMeasurement, TextMeasurementInput } from "@updf/core/measurement";
import type { VNode } from "@updf/core/vdom";
import type { BlockStyle } from "./container-types.js";
import type {
  BlockComponent,
  BlockContent,
  ContentConstraints,
  ImplicitInlineContent,
  ParagraphProps,
} from "./content-types.js";
import type { DecorationPlan } from "./decoration-types.js";

declare const adapterBrand: unique symbol;
declare const extensionsBrand: unique symbol;
declare const blockBrand: unique symbol;

export type ReadonlyProps<T> = T extends ContentHandle | VNode | BlockContent | ImplicitInlineContent
  ? Readonly<T>
  : T extends readonly unknown[]
    ? { readonly [K in keyof T]: ReadonlyProps<T[K]> }
    : T extends object
      ? { readonly [K in keyof T]: ReadonlyProps<T[K]> }
      : T;
export interface MeasureContext {
  readonly width: number;
  readonly sourcePath: string;
  readonly ancestors: readonly string[];
  readonly measureText: (input: TextMeasurementInput) => TextMeasurement;
  readonly measureContent: ContentMeasurer;
  readonly readParts: (content: BlockContent, allowed: readonly BlockPartIdentity[]) => readonly BlockPart[];
  readonly reserveDecorations: (entries: readonly ContentDecoration[]) => DecorationPlan;
}
export interface ContentDecoration {
  readonly edge: "before" | "after";
  readonly repeat: "first" | "all" | "last";
  readonly height: number;
  readonly content: BlockContent;
}
declare const partBrand: unique symbol;
declare const scopeBrand: unique symbol;
export interface BlockPartIdentity {
  readonly [partBrand]: true;
}
export type BlockPartComponent<P extends object> = BlockComponent<P> & BlockPartIdentity;
export interface ScopedContent extends ContentHandle {
  readonly [scopeBrand]: true;
}
export interface BlockPart {
  readonly key?: string | number;
  readonly part: BlockPartIdentity;
  readonly props: Readonly<Record<string, unknown>>;
  readonly content: ScopedContent;
  readonly sourcePath: string;
}
export interface AdapterContentConstraints extends ContentConstraints {
  readonly style?: BlockStyle;
  readonly sourcePath?: string;
  readonly defaults?: ParagraphProps;
  readonly implicitParagraph?: boolean;
}
export interface ContentMeasurer {
  (content: BlockContent, constraints: AdapterContentConstraints): MeasuredContent;
  (
    content: BlockContent | ImplicitInlineContent,
    constraints: AdapterContentConstraints & { readonly implicitParagraph: true },
  ): MeasuredContent;
}
export interface MeasuredContent {
  readonly size: { readonly width: number; readonly height: number };
  readonly nodes: readonly NodeDefinition[];
}
export interface BlockFragmentRequest {
  readonly offset: number;
  readonly availableHeight: number;
  readonly freshHeight: number;
  readonly atFreshRegion: boolean;
  readonly width: number;
}
export type BlockFragment =
  | { readonly status: "defer" }
  | {
      readonly status: "placed";
      readonly nextOffset: number;
      readonly height: number;
      readonly nodes: readonly NodeDefinition[];
      readonly decorations?: DecorationPlan;
    };
export interface MeasuredBlock {
  readonly sourceExtent?: number;
  readonly sourceKeys?: readonly (string | number | null)[];
  readonly sourcePaths?: readonly string[];
  readonly fragmentation: "atomic" | "splittable";
  readonly naturalSize: { readonly width: number; readonly height: number };
  readonly extent: number;
  readonly decorations?: DecorationPlan;
  readonly fragment: (request: BlockFragmentRequest) => BlockFragment;
}
export interface BlockAdapterDefinition<P> {
  readonly name: string;
  readonly validate: (input: unknown) => P;
  readonly measure: (props: ReadonlyProps<P>, context: MeasureContext) => MeasuredBlock;
}
export interface BlockAdapterIdentity {
  readonly name: string;
  readonly [adapterBrand]: unknown;
}
export interface BlockAdapter<P> extends BlockAdapterIdentity {
  readonly [adapterBrand]: (props: P) => P;
}
export interface ExtensionBlock {
  readonly type: "extension";
  readonly props: unknown;
  readonly [blockBrand]: true;
}
export interface Extensions {
  readonly [extensionsBrand]: true;
}
