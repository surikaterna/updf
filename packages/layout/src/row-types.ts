import type { BlockStyle } from "./container-types.js";
import type { BlockContent } from "./content-types.js";
import type { FlowBlock } from "./types.js";
import type { WidthTrack } from "./width-types.js";

/** Vertical alignment within an atomic row; default top, stretch conflicts with child height constraints. */
export type RowAlignment = "top" | "middle" | "bottom" | "stretch";
/** Column local box style; width/bounds belong to the WidthTrack, not this style. */
export type ColumnStyle = Omit<BlockStyle, "width" | "minWidth" | "maxWidth" | "marginTop">;
/** Row box style; hidden overflow and auto top margin are unsupported. */
export type RowStyle = Omit<BlockStyle, "overflow" | "marginTop"> & { readonly overflow?: "error" };
/** Vertical column; standalone columns can fragment, while columns inside a Row move atomically. */
export interface ColumnInput {
  readonly children: readonly FlowBlock[];
  readonly width?: WidthTrack;
  readonly style?: ColumnStyle;
  readonly keepTogether?: boolean;
}
export interface ColumnBlock extends ColumnInput {
  readonly type: "column";
}
/** Atomic horizontal collection of Columns; allocate widths before measuring descendants. */
export interface RowInput {
  readonly children: readonly ColumnBlock[];
  readonly align?: RowAlignment;
  readonly style?: RowStyle;
}
export interface RowBlock extends RowInput {
  readonly type: "row";
}
export interface RowProps extends Omit<RowInput, "children"> {
  readonly children: BlockContent;
}
export interface ColumnProps extends Omit<ColumnInput, "children"> {
  readonly children: BlockContent;
}
