import type { Box, DocumentDefinition, NodeDefinition, ParagraphDefinition } from "@updf/core";
import type { ContainerBlock } from "./container-types.js";
import type { ParagraphContent } from "./content-types.js";
import type { ExtensionBlock } from "./extension-types.js";
import type { ColumnBlock, RowBlock } from "./row-types.js";

export interface PageRegion {
  readonly height: number;
  readonly children: readonly NodeDefinition[];
}
export interface PageTemplate {
  readonly width: number;
  readonly height: number;
  readonly margins: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly header?: PageRegion;
  readonly footer?: PageRegion;
  readonly headerBodyGap?: number;
  readonly bodyFooterGap?: number;
}
export interface ParagraphBlock {
  readonly type: "paragraph";
  readonly paragraph: ParagraphDefinition;
  readonly keepTogether?: boolean;
}
export interface SpacerBlock {
  readonly type: "spacer";
  readonly height: number;
}
export interface PageBreakBlock {
  readonly type: "pageBreak";
}
export interface FixedBlock extends PageRegion {
  readonly type: "fixed";
}
export type FlowBlock =
  | ParagraphBlock
  | SpacerBlock
  | PageBreakBlock
  | FixedBlock
  | ExtensionBlock
  | ContainerBlock
  | RowBlock
  | ColumnBlock
  | ParagraphContent;
export interface FlowDocumentDefinition {
  readonly pageTemplate: PageTemplate;
  readonly body: readonly FlowBlock[];
}
export interface FlowPlacement {
  readonly sourceKeys?: readonly (string | number | null)[];
  readonly sourceRange?: { readonly start: number; readonly end: number };
  readonly sourceIndex: number;
  readonly sourcePath: string;
  readonly pageIndex: number;
  readonly box: Box;
  /** Half-open measured line range, present only for paragraph placements. */
  readonly lines?: { readonly start: number; readonly end: number };
}
export interface FlowResult {
  readonly document: DocumentDefinition;
  readonly pageCount: number;
  readonly consumed: number;
  readonly placements: readonly FlowPlacement[];
}
