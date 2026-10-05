/** Canvas/top-left affine: x'=a*x+c*y+e, y'=b*x+d*y+f. */
export type Matrix = readonly [number, number, number, number, number, number];
/** Normalized [red, green, blue] components in 0..1. */
export type RGB = readonly [number, number, number];
/**
 * Local drawing style. Paths default to black fill/no stroke; rectangles/lines to no fill/black stroke.
 * Opacity defaults to 1, width to 1 point for paths or 0.5 for rectangles/lines.
 * Optional fields must be omitted, not explicitly undefined.
 */
export interface Paint {
  /** Null disables fill; omission selects the shape default. */
  readonly fill?: RGB | null;
  /** Null disables stroke; omission selects the shape default. */
  readonly stroke?: RGB | null;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
  /** Zero explicitly disables stroke; it never requests a PDF hairline. */
  readonly width?: number;
  /** Defaults to nonzero. */
  readonly fillRule?: "nonzero" | "evenodd";
  /** Defaults to butt. */
  readonly lineCap?: "butt" | "round" | "square";
  /** Defaults to miter. */
  readonly lineJoin?: "miter" | "round" | "bevel";
  /** Dimensionless ratio, at least 1; defaults to 10. */
  readonly miterLimit?: number;
  /** Nonnegative point lengths; empty means solid, odd patterns repeat, all-zero patterns fail. */
  readonly dash?: readonly number[];
  /** Point phase, normalized modulo the pattern period; defaults to 0. */
  readonly dashOffset?: number;
}
/** Per-node painting options; absent transform is identity, without inherited styles. */
export interface Painting {
  readonly paint?: Paint;
  readonly transform?: Matrix;
}
/** Start a subpath at a local point. */
export interface MoveCommand {
  readonly type: "move";
  readonly x: number;
  readonly y: number;
}
/** Straight segment to a local endpoint after a move. */
export interface LineCommand {
  readonly type: "line";
  readonly x: number;
  readonly y: number;
}
/** Cubic segment: (x1,y1), (x2,y2) controls and (x,y) endpoint, all local points. */
export interface CubicCommand {
  readonly type: "cubic";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly x: number;
  readonly y: number;
}
/** Close the current subpath to its starting point. */
export interface CloseCommand {
  readonly type: "close";
}
/** Native path grammar; no implicit move or string-path parsing. */
export type PathCommand = MoveCommand | LineCommand | CubicCommand | CloseCommand;
/** Local path geometry; transformed ink/stroke bounds are checked during rendering. */
export interface PathNode extends Painting {
  readonly type: "path";
  readonly commands: readonly PathCommand[];
}
/** Local top-left rectangular clip in points, transformed with its group. */
export interface ClipRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
/** Ordered drawing container; transform composes with ancestors, clip does not relax geometry checks. */
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
