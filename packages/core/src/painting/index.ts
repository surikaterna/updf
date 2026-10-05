/**
 * `@updf/core/painting`: native paths, paint and top-left affine helpers, without SVG parsing.
 * Drawing lengths use PDF points; RGB and opacity use normalized 0..1 components.
 * @module
 */
export { identity, multiply, point } from "./affine.js";
export type {
  ClipRect,
  CloseCommand,
  CubicCommand,
  LineCommand,
  Matrix,
  MoveCommand,
  Paint,
  PaintGroup,
  Painting,
  PathCommand,
  PathNode,
  RGB,
} from "./types.js";
