import type { RGB, TextAlign, TextNode } from "../types.js";

export interface TextStyle {
  readonly font: string;
  readonly fontSize: number;
  readonly color: RGB;
}
export interface TextRun {
  readonly text: string;
  readonly style?: Partial<TextStyle>;
}
export interface ParagraphDefinition {
  readonly runs: readonly TextRun[];
  readonly defaultStyle: TextStyle;
  readonly lineHeight: number;
  readonly align: TextAlign;
  readonly whiteSpace: "preserve" | "collapse";
  readonly breakLongWords: "error" | "codePoint";
}
export interface RichTextInput {
  readonly kind: "rich";
  readonly width: number;
  readonly height?: number;
  readonly paragraphs: readonly ParagraphDefinition[];
}
export type PlainTextInput = Omit<TextNode, "type" | "x" | "y" | "height"> & {
  readonly kind: "plain";
  readonly height?: number;
};
export type TextMeasurementInput = PlainTextInput | RichTextInput;
export type InkBounds =
  | { readonly empty: true }
  | {
      readonly empty: false;
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    };
export interface TextFragmentMeasurement {
  readonly text: string;
  readonly style: TextStyle;
  readonly x: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly runIndex: number;
  readonly source: { readonly start: number; readonly end: number };
}
export interface TextLineMeasurement {
  readonly paragraphIndex: number;
  readonly top: number;
  readonly height: number;
  readonly baseline: number;
  readonly advance: number;
  readonly inkBounds: InkBounds;
  readonly fragments: readonly TextFragmentMeasurement[];
  readonly breakReason: "soft" | "hard" | "paragraphEnd";
}
export interface TextMeasurement {
  readonly width: number;
  readonly consumedHeight: number;
  readonly lineCount: number;
  readonly lines: readonly TextLineMeasurement[];
}
