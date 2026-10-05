import type { RGB, TextAlign, TextNode } from "../types.js";

/** Effective font ID, positive point size and normalized RGB; no synthetic bold/italic or fallback. */
export interface TextStyle {
  readonly font: string;
  readonly fontSize: number;
  readonly color: RGB;
}
/** Original string with per-property overrides of paragraph defaults, never of the previous run. */
export interface TextRun {
  readonly text: string;
  readonly style?: Partial<TextStyle>;
}
/** Explicit rich paragraph policy; empty paragraphs consume one line and LF creates hard breaks. */
export interface ParagraphDefinition {
  readonly runs: readonly TextRun[];
  readonly defaultStyle: TextStyle;
  /** Absolute points; must contain every effective font size and the shared ink envelope. */
  readonly lineHeight: number;
  readonly align: TextAlign;
  /** Preserve U+0020 sequences, or collapse across runs and trim line edges. */
  readonly whiteSpace: "preserve" | "collapse";
  /** Oversized tokens fail, or split at scalar boundaries; a scalar wider than the box still fails. */
  readonly breakLongWords: "error" | "codePoint";
}
/** Rich measurement box in points; supplied height is a hard bound, not a clipping request. */
export interface RichTextInput {
  readonly kind: "rich";
  readonly width: number;
  readonly height?: number;
  readonly paragraphs: readonly ParagraphDefinition[];
}
/** Plain fixed-text semantics without page position; empty text consumes zero lines. */
export type PlainTextInput = Omit<TextNode, "type" | "x" | "y" | "height"> & {
  readonly kind: "plain";
  readonly height?: number;
};
/** Discriminated measurement input; omit optional fields rather than supplying undefined. */
export type TextMeasurementInput = PlainTextInput | RichTextInput;
/** Visible ink envelope in top-left measurement coordinates, or an explicit empty marker. */
export type InkBounds =
  | { readonly empty: true }
  | {
      readonly empty: false;
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    };
/** Effective styled fragment; positions and advance are points, not UTF-16 character widths. */
export interface TextFragmentMeasurement {
  readonly text: string;
  readonly style: TextStyle;
  readonly x: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly runIndex: number;
  /** Half-open UTF-16 offsets in the original run (plain input uses its single text string). */
  readonly source: { readonly start: number; readonly end: number };
}
/** One measured line; top/baseline are relative to the measurement origin in points. */
export interface TextLineMeasurement {
  readonly paragraphIndex: number;
  readonly top: number;
  readonly height: number;
  readonly baseline: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly fragments: readonly TextFragmentMeasurement[];
  /** soft = width wrap, hard = LF, paragraphEnd = final line (including empty paragraphs). */
  readonly breakReason: "soft" | "hard" | "paragraphEnd";
}
/** Deeply frozen metrics; width is the requested box width, consumedHeight is actual line height sum. */
export interface TextMeasurement {
  readonly width: number;
  readonly consumedHeight: number;
  readonly lineCount: number;
  readonly lines: readonly TextLineMeasurement[];
}
