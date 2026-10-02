import type { PreparedFont, PreparedGlyph } from "../fonts/types.js";
import type { Matrix, PaintGroup, PathNode, ResolvedDrawing } from "../painting/types.js";
import type { LineNode, RectangleNode, TextNode } from "../types.js";

export interface MeasuredLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly glyphs?: readonly PreparedGlyph[];
}

export interface MeasuredText extends TextNode {
  readonly lines: readonly MeasuredLine[];
  readonly preparedFont?: PreparedFont;
}

export interface MeasuredPage {
  readonly width: number;
  readonly height: number;
  readonly children: readonly MeasuredNode[];
}
export interface MeasuredRectangle extends RectangleNode {
  readonly painting?: ResolvedDrawing;
}
export interface MeasuredLineNode extends LineNode {
  readonly painting?: ResolvedDrawing;
}
export interface MeasuredPath extends PathNode {
  readonly painting: ResolvedDrawing;
}
export interface MeasuredPaintGroup extends PaintGroup<MeasuredNode> {
  readonly matrix: Matrix;
}
export type MeasuredNode = MeasuredText | MeasuredRectangle | MeasuredLineNode | MeasuredPath | MeasuredPaintGroup;
