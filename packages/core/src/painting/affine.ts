import { fail } from "../core/error.js";
import { array, finite } from "../core/schema.js";
import type { Matrix } from "./types.js";

/** Frozen neutral affine transform. */
export const identity: Matrix = Object.freeze([1, 0, 0, 1, 0, 0]);
/** Transformed [x, y] coordinates in points. */
export type Point = readonly [number, number];

export function matrix(value: unknown, path: string): Matrix {
  if (value === undefined) return identity;
  array(value, 6, path);
  if (value.length !== 6) fail("GEOMETRY", path, "Expected six affine coefficients");
  const result: Matrix = [
    finite(value[0], path),
    finite(value[1], path),
    finite(value[2], path),
    finite(value[3], path),
    finite(value[4], path),
    finite(value[5], path),
  ];
  const determinant = result[0] * result[3] - result[1] * result[2];
  if (!Number.isFinite(determinant) || determinant === 0)
    fail("GEOMETRY", path, "Affine must have a finite representable nonzero determinant");
  return Object.freeze(result);
}
/** Compose a × b (apply b first); returns a frozen matrix or throws DocumentError for invalid results. */
export function multiply(a: Matrix, b: Matrix): Matrix {
  return matrix(
    [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ],
    "/transform",
  );
}
/** Apply an affine to a point; nonfinite output fails with DocumentError. The returned tuple is not frozen. */
export function point(m: Matrix, x: number, y: number): Point {
  return [finite(m[0] * x + m[2] * y + m[4], "/transform"), finite(m[1] * x + m[3] * y + m[5], "/transform")];
}
/** Frobenius norm upper-bounds affine stretch, including nonuniform scale/skew. */
export function stretch(m: Matrix): number {
  return finite(Math.hypot(m[0], m[1], m[2], m[3]), "/transform");
}
