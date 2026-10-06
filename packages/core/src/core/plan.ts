import type { PrivateFragment } from "../measurement/lines.js";
import type { Matrix, PaintGroup, PathNode, ResolvedDrawing } from "../painting/types.js";
import type { LineNode, RectangleNode, RichTextNode } from "../types.js";
export interface MeasuredRichText extends RichTextNode {
  readonly fragments: readonly PrivateFragment[];
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
export type MeasuredNode = MeasuredRichText | MeasuredRectangle | MeasuredLineNode | MeasuredPath | MeasuredPaintGroup;
