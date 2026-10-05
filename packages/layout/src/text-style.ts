import type { RGB, TextAlign } from "@updf/core";
import { validateLineHeight } from "@updf/text";

/** Absolute positive finite line-box length in points, created with pt(). */
export interface PointLength {
  readonly unit: "pt";
  readonly value: number;
}
/** Positive font-size ratio, font-aware normal (default), or absolute point length; zero is unsupported. */
export type LineHeight = number | "normal" | PointLength;
/** Inherited per-key text styling; the installed service selects the font, with 10pt, black, normal line height. */
export interface SpanStyle {
  readonly backgroundColor?: RGB;
  /** A registered font resource ID, not a CSS family or fallback list. */
  readonly font?: string;
  /** Positive finite point size, not pixels. */
  readonly fontSize?: number;
  readonly color?: RGB;
  readonly lineHeight?: LineHeight;
}
/** Paragraph-only left/center/right alignment (default left) plus inherited text fields. */
export interface ParagraphStyle extends Omit<SpanStyle, "backgroundColor"> {
  readonly textAlign?: TextAlign;
}
/** Create a frozen absolute line height; throws a core validation error unless value is positive finite. */
export function pt(value: number): PointLength {
  const length: PointLength = { unit: "pt", value };
  validateLineHeight(length, "/pt");
  return Object.freeze(length);
}
