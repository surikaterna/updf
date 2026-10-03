import type { NodeDefinition } from "@updf/core";
import type { ContentHandle } from "@updf/core/internal";
import type { VDOMChild, VNode } from "@updf/core/vdom";
import type { Insets } from "./container-types.js";
import type { BlockContent } from "./content-types.js";
import type { Extensions } from "./extension-types.js";
import type { Orientation, PageDimensions } from "./page-size.js";

export interface PageProps {
  readonly size: PageDimensions;
  readonly orientation?: Orientation;
  readonly children?: VDOMChild | readonly NodeDefinition[];
}
export interface FlowProps {
  readonly pageSize: PageDimensions;
  readonly orientation?: Orientation;
  readonly margins: Insets;
  readonly children?: BlockContent | RegionContent | readonly (BlockContent | RegionContent)[];
  readonly extensions?: Extensions;
}
export interface RegionProps {
  readonly height: number;
  readonly children?: BlockContent | VDOMChild | readonly NodeDefinition[];
}
export interface BodyProps {
  readonly children?: BlockContent;
}
export interface DocumentProps {
  readonly children?: DocumentContent;
}
export interface PageContent extends ContentHandle {
  readonly type: "fixedPage";
  readonly props: PageProps;
}
export interface FlowContent extends ContentHandle {
  readonly type: "flowSection";
  readonly props: FlowProps;
}
export interface RegionContent extends ContentHandle {
  readonly type: "flowHeader" | "flowFooter" | "flowBody";
  readonly props: RegionProps | BodyProps;
}
export interface DocumentContentData extends ContentHandle {
  readonly type: "mixedDocument";
  readonly props: DocumentProps;
}
export type DocumentContent = PageContent | FlowContent | VNode | readonly DocumentContent[] | null | boolean;
