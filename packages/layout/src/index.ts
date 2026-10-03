import type { RenderOptions } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import type { Extensions } from "./extension-types.js";
import { layout } from "./layout.js";
import type { FlowDocumentDefinition, FlowResult } from "./types.js";

export { blockComponent, defineBlockPart } from "./author-parts.js";
export { block } from "./container-data.js";
export type { BlockInput, BlockStyle, ContainerBlock, Insets } from "./container-types.js";
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

export function layoutFlow(
  input: FlowDocumentDefinition,
  options: RenderOptions = {},
  extensions?: Extensions,
): FlowResult {
  return layoutFlowUnknown(input, options, extensions);
}
export function layoutFlowUnknown(input: unknown, options: RenderOptions = {}, extensions?: Extensions): FlowResult {
  const operation = createDrawingLayoutOperation(options);
  try {
    return layout(input, operation, extensions);
  } finally {
    operation.close();
  }
}
