import type { BlockStyle } from "./container-types.js";
import type { BlockContent } from "./content-types.js";
import type { FlowBlock } from "./types.js";
import type { WidthTrack } from "./width-types.js";

export type RowAlignment = "top" | "middle" | "bottom" | "stretch";
export type ColumnStyle = Omit<BlockStyle, "width" | "minWidth" | "maxWidth">;
export type RowStyle = Omit<BlockStyle, "overflow"> & { readonly overflow?: "error" };
export interface ColumnInput {
  readonly children: readonly FlowBlock[];
  readonly width?: WidthTrack;
  readonly style?: ColumnStyle;
  readonly keepTogether?: boolean;
}
export interface ColumnBlock extends ColumnInput {
  readonly type: "column";
}
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
