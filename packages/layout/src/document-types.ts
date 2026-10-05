import type { NodeDefinition } from "@updf/core";
import type { ContentHandle } from "@updf/core/internal";
import type { VDOMChild, VNode } from "@updf/core/vdom";
import type { Insets } from "./container-types.js";
import type { BlockContent } from "./content-types.js";
import type { Extensions } from "./extension-types.js";
import type { Orientation, PageDimensions } from "./page-size.js";

/** Fixed drawing page, not flowing block content; dimensions are positive finite points. */
export interface PageProps {
  readonly size: PageDimensions;
  /** Omission preserves size order; portrait/landscape orders the short/long sides. */
  readonly orientation?: Orientation;
  readonly children?: VDOMChild | readonly NodeDefinition[];
}
/** Paginated block section; explicit nonnegative point margins must leave a positive body. */
export interface FlowProps {
  readonly pageSize: PageDimensions;
  readonly orientation?: Orientation;
  readonly margins: Insets;
  /** Use direct body blocks or one flowBody, never both; at most one header/footer. */
  readonly children?: BlockContent | RegionContent | readonly (BlockContent | RegionContent)[];
  /** Local owned adapter set, not a global registry; omission installs no custom adapters. */
  readonly extensions?: Extensions;
}
/** Repeated Flow header/footer rendered with sealed final page context, without repagination. */
export interface RegionProps {
  /** Positive finite reserved height in points; generated content must fit this region. */
  readonly height: number;
  readonly children?: BlockContent | VDOMChild | readonly NodeDefinition[];
}
/** Explicit Flow body slot; cannot be mixed with direct body siblings. */
export interface BodyProps {
  readonly children?: BlockContent;
}
/** Ordered Page/Flow sections; layout requires at least one resulting page. */
export interface DocumentProps {
  readonly children?: DocumentContent;
}
/** Owned snapshot from page(); serialized lookalikes do not preserve ownership. */
export interface PageContent extends ContentHandle {
  readonly type: "fixedPage";
  readonly props: PageProps;
}
/** Owned flow() snapshot; consumed by layout, not directly by the PDF serializer. */
export interface FlowContent extends ContentHandle {
  readonly type: "flowSection";
  readonly props: FlowProps;
}
/** Owned flowHeader/flowFooter/flowBody slot descriptor. */
export interface RegionContent extends ContentHandle {
  readonly type: "flowHeader" | "flowFooter" | "flowBody";
  readonly props: RegionProps | BodyProps;
}
/** Owned document() snapshot, accepted alongside JSX by layout(). */
export interface DocumentContentData extends ContentHandle {
  readonly type: "mixedDocument";
  readonly props: DocumentProps;
}
/** Section grammar: arrays group content; null/booleans contribute no section. */
export type DocumentContent = PageContent | FlowContent | VNode | readonly DocumentContent[] | null | boolean;
