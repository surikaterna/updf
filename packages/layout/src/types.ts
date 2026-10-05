import type { Box, DocumentDefinition, NodeDefinition, ParagraphDefinition } from "@updf/core";
import type { ContainerBlock } from "./container-types.js";
import type { ParagraphContent } from "./content-types.js";
import type { ExtensionBlock } from "./extension-types.js";
import type { ColumnBlock, RowBlock } from "./row-types.js";

/** Fixed local native nodes in a reserved point-height region. */
export interface PageRegion {
  readonly height: number;
  readonly children: readonly NodeDefinition[];
}
/** Low-level point template for flow data; margins/reservations must leave positive body geometry. */
export interface PageTemplate {
  readonly width: number;
  readonly height: number;
  readonly margins: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly header?: PageRegion;
  readonly footer?: PageRegion;
  readonly headerBodyGap?: number;
  readonly bodyFooterGap?: number;
}
/** Fixed core paragraph definition used as flowing text; keepTogether defaults false. */
export interface ParagraphBlock {
  readonly type: "paragraph";
  readonly paragraph: ParagraphDefinition;
  readonly keepTogether?: boolean;
}
/** Nonnegative finite point-height flow reservation without ink. */
export interface SpacerBlock {
  readonly type: "spacer";
  readonly height: number;
}
/** Flow control marker, not a box with physical height. */
export interface PageBreakBlock {
  readonly type: "pageBreak";
}
/** Atomic native drawing block; oversized geometry fails rather than splitting. */
export interface FixedBlock extends PageRegion {
  readonly type: "fixed";
}
/** Supported low-level flow block discriminated union; custom blocks use owned ExtensionBlock. */
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
/** Low-level template/body shape, not a PDF document; there is no public layoutFlow export. */
export interface FlowDocumentDefinition {
  readonly pageTemplate: PageTemplate;
  readonly body: readonly FlowBlock[];
}
/** Frozen layout placement: zero-based source/page indices, point box and optional half-open source range. */
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
/** Low-level flow report shape; public mixed-document layout returns DocumentLayoutResult instead. */
export interface FlowResult {
  readonly document: DocumentDefinition;
  readonly pageCount: number;
  readonly consumed: number;
  readonly placements: readonly FlowPlacement[];
}
