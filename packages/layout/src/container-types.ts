import type { RGB } from "@updf/core";
import type { BorderPolicy } from "./borders.js";
import type { DecorationPlan } from "./decoration-types.js";
import type { FlowBlock } from "./types.js";

/** Explicit nonnegative finite point insets; no CSS shorthand or implicit unit conversion. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
/** Local point padding/background; padding defaults to zero and per-edge values override shorthand. */
export interface BoxStyle {
  readonly padding?: number;
  readonly paddingTop?: number;
  readonly paddingRight?: number;
  readonly paddingBottom?: number;
  readonly paddingLeft?: number;
  readonly backgroundColor?: RGB;
}
/** Border-box point constraints; box fields do not inherit into descendants. */
export interface BlockStyle extends BoxStyle, BorderPolicy {
  /** Absorb available vertical space only in a definite alignment region. */
  readonly marginTop?: "auto";
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly gap?: number;
  /** Default error; hidden clips an explicitly constrained box, not oversized atomic rows. Not redaction. */
  readonly overflow?: "error" | "hidden";
}
/** Vertical stack; keepTogether defaults false, with optional owned decoration reservations. */
export interface ContainerBlock {
  readonly type: "block";
  readonly children: readonly FlowBlock[];
  readonly style?: BlockStyle;
  readonly keepTogether?: boolean;
  readonly decorations?: DecorationPlan;
}
/** Data constructor input without the block discriminant. */
export type BlockInput = Omit<ContainerBlock, "type">;
