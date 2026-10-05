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
import type { EdgeRegionInput } from "./shared-edge-types.js";

declare const adapterBrand: unique symbol;
declare const extensionsBrand: unique symbol;
declare const blockBrand: unique symbol;

/** Readonly adapter props, preserving opaque content handles rather than recursively expanding their grammars. */
export type ReadonlyProps<T> = T extends ContentHandle | VNode | BlockContent | ImplicitInlineContent
  ? Readonly<T>
  : T extends readonly unknown[]
    ? { readonly [K in keyof T]: ReadonlyProps<T[K]> }
    : T extends object
      ? { readonly [K in keyof T]: ReadonlyProps<T[K]> }
      : T;
/** Operation-owned synchronous measurement services; do not retain for use after layout/measure returns. */
export interface MeasureContext {
  /** Available positive point width for this occurrence. */
  readonly width: number;
  readonly sourcePath: string;
  readonly ancestors: readonly string[];
  /** Charge bounded adapter work to the operation's source-node budget before scanning. */
  readonly chargeSourceWork: (count: number, sourcePath: string) => void;
  readonly measureText: (input: TextMeasurementInput) => TextMeasurement;
  readonly measureContent: ContentMeasurer;
  readonly readParts: (content: BlockContent, allowed: readonly BlockPartIdentity[]) => readonly BlockPart[];
  readonly reserveDecorations: (entries: readonly ContentDecoration[]) => DecorationPlan;
  /** Operation-owned local report/content wrapper; copies and serialized wrappers carry no claims. */
  readonly edgeRegion: (input: EdgeRegionInput) => NodeDefinition;
}
/** Reserved before/after block content; first/all/last selects occurrence fragments, height is points. */
export interface ContentDecoration {
  readonly edge: "before" | "after";
  readonly repeat: "first" | "all" | "last";
  readonly height: number;
  readonly content: BlockContent;
}
declare const partBrand: unique symbol;
declare const scopeBrand: unique symbol;
/** Owned author-slot identity; structurally similar or serialized values cannot substitute. */
export interface BlockPartIdentity {
  readonly [partBrand]: true;
}
export type BlockPartComponent<P extends object> = BlockComponent<P> & BlockPartIdentity;
/** Captured author content scoped to one operation; cannot be transferred between measurements. */
export interface ScopedContent extends ContentHandle {
  readonly [scopeBrand]: true;
}
/** Captured slot report with scoped children and readonly props, returned by readParts. */
export interface BlockPart {
  readonly key?: string | number;
  readonly part: BlockPartIdentity;
  readonly props: Readonly<Record<string, unknown>>;
  readonly content: ScopedContent;
  readonly sourcePath: string;
}
/** Point constraints plus explicit adapter defaults; implicitParagraph enables all-inline coercion. */
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
/** Natural point size and native local-origin nodes; not an independently paginated document. */
export interface MeasuredContent {
  readonly size: { readonly width: number; readonly height: number };
  readonly nodes: readonly NodeDefinition[];
}
/** Source-unit offset and point region capacity; offset is not a vertical point coordinate. */
export interface BlockFragmentRequest {
  readonly offset: number;
  readonly availableHeight: number;
  readonly freshHeight: number;
  readonly atFreshRegion: boolean;
  readonly width: number;
}
/** Defer without progress or place a progressing source range with local native nodes and point height. */
export type BlockFragment =
  | { readonly status: "defer" }
  | {
      readonly status: "placed";
      readonly nextOffset: number;
      readonly height: number;
      readonly nodes: readonly NodeDefinition[];
      readonly decorations?: DecorationPlan;
    };
/** Measured adapter protocol; extent is positive source units, naturalSize is points, atomic blocks cannot split. */
export interface MeasuredBlock {
  /** Resolve selected before/body/after root reports together, independently of decoration reservation. */
  readonly sharedEdges?: boolean;
  readonly sourceExtent?: number;
  readonly sourceKeys?: readonly (string | number | null)[];
  readonly sourcePaths?: readonly string[];
  readonly fragmentation: "atomic" | "splittable";
  readonly naturalSize: { readonly width: number; readonly height: number };
  readonly extent: number;
  readonly decorations?: DecorationPlan;
  readonly fragment: (request: BlockFragmentRequest) => BlockFragment;
}
/** Trusted synchronous callbacks; validate returns snapshot-compatible props, measure returns a fragment producer. */
export interface BlockAdapterDefinition<P> {
  readonly name: string;
  readonly validate: (input: unknown) => P;
  readonly measure: (props: ReadonlyProps<P>, context: MeasureContext) => MeasuredBlock;
}
/** Owned named adapter identity; names alone do not authorize descriptors. */
export interface BlockAdapterIdentity {
  readonly name: string;
  readonly [adapterBrand]: unknown;
}
/** Typed identity from defineBlockAdapter, reusable across independently scoped operations. */
export interface BlockAdapter<P> extends BlockAdapterIdentity {
  readonly [adapterBrand]: (props: P) => P;
}
/** Owned extension() snapshot; cannot be reconstructed from serialized props alone. */
export interface ExtensionBlock {
  readonly type: "extension";
  readonly props: unknown;
  readonly [blockBrand]: true;
}
/** Local capability set from createExtensions; no global installation or name-based fallback. */
export interface Extensions {
  readonly [extensionsBrand]: true;
}
