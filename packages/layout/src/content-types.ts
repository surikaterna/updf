import type { NodeDefinition, RenderOptions, RGB } from "@updf/core";
import type { ContentHandle } from "@updf/core/internal";
import type { InkBounds, TextStyle } from "@updf/core/measurement";
import type { ComponentContext, VDOMChild, VNode } from "@updf/core/vdom";
import type { BlockInput, ContainerBlock } from "./container-types.js";
import type { Extensions, ReadonlyProps, ScopedContent } from "./extension-types.js";
import type { ParagraphStyle, SpanStyle } from "./text-style.js";
import type { FlowBlock } from "./types.js";

/** Explicit inline grammar; numbers require conversion to strings (unlike implicit table cells). */
export type InlineContent = string | SpanContent | InlineVisual | VNode | readonly InlineContent[] | null | boolean;
/** All-inline cell/adapter grammar additionally permits finite scalar numbers. */
export type ImplicitInlineContent = InlineContent | number | readonly ImplicitInlineContent[];
/** Block grammar; arrays group blocks, null/booleans are empty, naked text needs Paragraph. */
export type BlockContent =
  | ScopedContent
  | ParagraphContent
  | ContainerBlock
  | FlowBlock
  | VNode
  | readonly BlockContent[]
  | null
  | boolean;
/** Alias for measurable block content. */
export type Content = BlockContent;
/** Flow text; splits only at complete measured lines unless keepTogether is enabled. */
export interface ParagraphProps {
  readonly children?: InlineContent;
  readonly style?: ParagraphStyle;
  /** Default collapse; preserve retains authored whitespace for line breaking. */
  readonly whiteSpace?: "preserve" | "collapse";
  /** Default error; codePoint permits splitting an otherwise unfit word at Unicode code points. */
  readonly breakLongWords?: "error" | "codePoint";
  /** Default false; true defers intact once, then fails LAYOUT_OVERSIZED if still unfit. */
  readonly keepTogether?: boolean;
}
/** Inline style layer inheriting paragraph/nesting text defaults, not a block box. */
export interface SpanProps {
  readonly children?: InlineContent;
  readonly style?: SpanStyle;
}
export interface ParagraphContent extends ContentHandle {
  readonly type: "contentParagraph";
  readonly props: ParagraphProps;
}
export interface SpanContent extends ContentHandle {
  readonly type: "contentSpan";
  readonly props: SpanProps;
}
export interface InlineVisual extends ContentHandle {
  readonly type: "inlineVisual";
  readonly props: unknown;
}
// Child grammars are already readonly; keep them opaque rather than recursively
// expanding core DeepReadonly through both content and VNode unions.
export type InlineComponent<P extends object = SpanProps> = (
  props: Readonly<P>,
  context: ComponentContext,
) => VDOMChild;
export type BlockComponent<P extends object = ParagraphProps> = (
  props: Readonly<P>,
  context: ComponentContext,
) => VDOMChild;
export interface ContentBlockProps extends Omit<BlockInput, "children"> {
  readonly children: BlockContent;
}
declare const inlineAdapter: unique symbol;
export interface InlineAdapterIdentity {
  readonly name: string;
  readonly [inlineAdapter]: true;
}
export interface InlineAdapter<P> extends InlineAdapterIdentity {
  readonly propsType?: (props: P) => P;
}
export interface InlineMeasureContext {
  readonly width: number;
  readonly style: TextStyle;
  readonly measureNative: (
    nodes: readonly NodeDefinition[],
    size: { readonly width: number; readonly height: number },
  ) => InkBounds;
}
/** Point metrics; positive advance and positive ascent+descent, with ink inside the declared box. */
export interface InlineMeasurement {
  readonly advance: number;
  readonly ascent: number;
  readonly descent: number;
  /** Coordinates relative to the baseline, y positive downwards. */
  readonly inkBounds: InkBounds;
  /** Native geometry at box top-left; box height is ascent + descent. */
  readonly nodes: readonly NodeDefinition[];
}
/** Trusted synchronous validation/measurement callbacks; no asynchronous work or sandbox. */
export interface InlineAdapterDefinition<P> {
  readonly name: string;
  readonly validate: (input: unknown) => P;
  readonly measure: (props: ReadonlyProps<P>, context: InlineMeasureContext) => InlineMeasurement;
}
/** Positive finite point width and optional nonnegative finite natural-height ceiling. */
export interface ContentConstraints {
  readonly width: number;
  readonly height?: number;
}
/** Resource/policy measurement options plus a local owned adapter set. */
export interface ContentOptions extends RenderOptions {
  readonly extensions?: Extensions;
}
export interface ContentTextFragment {
  readonly role: "text";
  readonly text: string;
  readonly style: TextStyle;
  readonly x: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly source: { readonly path: string; readonly start: number; readonly end: number };
}
export interface ContentVisualFragment {
  readonly role: "visual";
  readonly x: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly source: { readonly path: string };
}
/** Point-valued line report in measurement coordinates, y down; baseline is not box bottom. */
export interface ContentLine {
  readonly top: number;
  readonly height: number;
  readonly baseline: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly fragments: readonly (ContentTextFragment | ContentVisualFragment)[];
  readonly breakReason: "soft" | "hard" | "paragraphEnd";
}
/** Deeply frozen natural-size/line/ink report; not a reusable painting capability. */
export interface ContentMeasurement {
  readonly size: { readonly width: number; readonly height: number };
  readonly lines: readonly ContentLine[];
  readonly inkBounds: InkBounds;
}
export type ContentColor = RGB;
