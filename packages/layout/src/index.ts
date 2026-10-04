export { blockComponent, defineBlockPart } from "./author-parts.js";
export type { BorderEdge, BorderLayer, BorderPolicy, ExpandedBorders } from "./borders.js";
export { expandBorders, mergeBorders } from "./borders.js";
export { block } from "./container-data.js";
export type { BlockInput, BlockStyle, BoxStyle, ContainerBlock, Insets } from "./container-types.js";
export { Block, Paragraph, paragraph, Span, span } from "./content-data.js";
export { measure } from "./content-measure.js";
export type {
  BlockComponent,
  BlockContent,
  Content,
  ContentBlockProps,
  ContentConstraints,
  ContentLine,
  ContentMeasurement,
  ContentOptions,
  ContentTextFragment,
  ContentVisualFragment,
  ImplicitInlineContent,
  InlineAdapter,
  InlineAdapterDefinition,
  InlineAdapterIdentity,
  InlineComponent,
  InlineContent,
  InlineMeasureContext,
  InlineMeasurement,
  InlineVisual,
  ParagraphContent,
  ParagraphProps,
  SpanContent,
  SpanProps,
} from "./content-types.js";
export type { DecorationPlan, StaticDecoration } from "./decoration-types.js";
export { createDecorationPlan } from "./decorations.js";
export type { BlockRegionProps } from "./deferred-decoration.js";
export { document, flow, flowBody, flowFooter, flowHeader, page } from "./document-data.js";
export type {
  BodyProps,
  DocumentContent,
  DocumentContentData,
  DocumentProps,
  FlowContent,
  FlowProps,
  PageContent,
  PageProps,
  RegionContent,
  RegionProps,
} from "./document-types.js";
export type {
  AdapterContentConstraints,
  BlockAdapter,
  BlockAdapterDefinition,
  BlockAdapterIdentity,
  BlockFragment,
  BlockFragmentRequest,
  BlockPart,
  BlockPartComponent,
  BlockPartIdentity,
  ContentDecoration,
  ExtensionBlock,
  Extensions,
  MeasureContext,
  MeasuredBlock,
  MeasuredContent,
  ReadonlyProps,
  ScopedContent,
} from "./extension-types.js";
export { createExtensions, defineBlockAdapter, extension } from "./extensions.js";
export { defineInlineAdapter, inline } from "./inline-adapters.js";
export type { DocumentLayoutResult } from "./mixed-layout.js";
export { layout } from "./mixed-layout.js";
export type { FragmentInfo, PageInfo } from "./page-context.js";
export { FragmentContext, PageContext } from "./page-context.js";
export type { Orientation, PageDimensions } from "./page-size.js";
export { PageSize, pageSize } from "./page-size.js";
export type { EdgeRegionInput, LocalEdgeClaim } from "./shared-edge-types.js";
export type { LineHeight, ParagraphStyle, PointLength, SpanStyle } from "./text-style.js";
export { pt } from "./text-style.js";
export type {
  FixedBlock,
  FlowBlock,
  FlowDocumentDefinition,
  FlowPlacement,
  FlowResult,
  PageBreakBlock,
  PageRegion,
  PageTemplate,
  ParagraphBlock,
  SpacerBlock,
} from "./types.js";
export { Flow, MixedDocument as Document, Page } from "./vdom.js";
