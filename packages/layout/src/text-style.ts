import type { RGB, TextAlign } from "@updf/core";
import { validateLineHeight } from "@updf/text";

export interface PointLength {
  readonly unit: "pt";
  readonly value: number;
}
export type LineHeight = number | "normal" | PointLength;
export interface SpanStyle {
  readonly backgroundColor?: RGB;
  /** A registered font resource ID, not a CSS family or fallback list. */
  readonly font?: string;
  readonly fontSize?: number;
  readonly color?: RGB;
  readonly lineHeight?: LineHeight;
}
export interface ParagraphStyle extends Omit<SpanStyle, "backgroundColor"> {
  readonly textAlign?: TextAlign;
}
export function pt(value: number): PointLength {
  const length: PointLength = { unit: "pt", value };
  validateLineHeight(length, "/pt");
  return Object.freeze(length);
}
