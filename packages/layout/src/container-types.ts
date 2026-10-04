import type { RGB } from "@updf/core";
import type { DecorationPlan } from "./decoration-types.js";
import type { FlowBlock } from "./types.js";

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
export interface BoxStyle {
  readonly padding?: number;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
  readonly backgroundColor?: RGB;
}
export interface BlockStyle extends BoxStyle {
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly border?: { readonly width: number; readonly color: RGB };
  readonly gap?: number;
  readonly overflow?: "error" | "hidden";
}
export interface ContainerBlock {
  readonly type: "block";
  readonly children: readonly FlowBlock[];
  readonly style?: BlockStyle;
  readonly keepTogether?: boolean;
  readonly decorations?: DecorationPlan;
}
export type BlockInput = Omit<ContainerBlock, "type">;
