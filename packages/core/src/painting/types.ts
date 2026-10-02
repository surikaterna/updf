/** Canvas/top-left affine: x'=a*x+c*y+e, y'=b*x+d*y+f. */
export type Matrix = readonly [number, number, number, number, number, number];
export type RGB = readonly [number, number, number];
export interface Paint {
  readonly fill?: RGB | null;
  readonly stroke?: RGB | null;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
  /** Zero explicitly disables stroke; it never requests a PDF hairline. */
  readonly width?: number;
  readonly fillRule?: "nonzero" | "evenodd";
  readonly lineCap?: "butt" | "round" | "square";
  readonly lineJoin?: "miter" | "round" | "bevel";
  readonly miterLimit?: number;
  readonly dash?: readonly number[];
  readonly dashOffset?: number;
}
export interface Painting {
  readonly paint?: Paint;
  readonly transform?: Matrix;
}
export interface MoveCommand {
  readonly type: "move";
  readonly x: number;
  readonly y: number;
}
export interface LineCommand {
  readonly type: "line";
  readonly x: number;
  readonly y: number;
}
export interface CubicCommand {
  readonly type: "cubic";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
}
export interface CloseCommand {
  readonly type: "close";
}
export type PathCommand = MoveCommand | LineCommand | CubicCommand | CloseCommand;
export interface PathNode extends Painting {
  readonly type: "path";
  readonly commands: readonly PathCommand[];
}
export interface ClipRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface PaintGroup<Node> {
  readonly type: "paintGroup";
  readonly children: readonly Node[];
  readonly transform?: Matrix;
  /** Local to this container, transformed with it. No paint/style inheritance. */
  readonly clip?: ClipRect;
}
export interface ResolvedPaint {
  readonly fill: RGB | null;
  readonly stroke: RGB | null;
  readonly fillOpacity: number;
  readonly strokeOpacity: number;
  readonly width: number;
  readonly fillRule: "nonzero" | "evenodd";
  readonly lineCap: "butt" | "round" | "square";
  readonly lineJoin: "miter" | "round" | "bevel";
  readonly miterLimit: number;
  readonly dash: readonly number[];
  readonly dashOffset: number;
}
export interface ResolvedDrawing {
  readonly commands: readonly PathCommand[];
  readonly paint: ResolvedPaint;
  readonly matrix: Matrix;
}
