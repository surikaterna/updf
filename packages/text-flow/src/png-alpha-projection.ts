import { fail } from "@updf/core/internal";
import { bits, successor, value } from "@updf/layout-boxes/numeric";
import { prepareCommands, type Charge, type PathBand } from "./command-band.js";
import type { PngShape } from "./png-shape.js";

interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
// Directed rounding bounds each individual derived operation, not a fit tolerance.
function up(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (n < 0) return -down(-n);
  const next = successor(bits(n));
  return next === undefined ? Infinity : value(next);
}
function down(n: number): number {
  if (!Number.isFinite(n)) return n;
  if (n < 0) return -up(-n);
  return n === 0 ? -Number.MIN_VALUE : value(bits(n) - 1n);
}
function transform(shape: PngShape, reference: Rectangle, outerWidth: number, path: string) {
  const { x, y, width, height } = reference;
  if (
    ![x, y, width, height, outerWidth, x + width, y + height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    outerWidth <= 0
  )
    fail("GEOMETRY", path, "Expected finite positive PNG placement without reflection or rotation");
  const sx = up(width / shape.width),
    syLow = down(height / shape.height),
    syHigh = up(height / shape.height);
  if (width / shape.width === 0 || syLow <= 0 || !Number.isFinite(sx) || !Number.isFinite(syHigh))
    fail("GEOMETRY", path, "Collapsed or nonfinite PNG transform");
  return { sx, syLow, syHigh };
}
export function alphaProjection(
  shape: PngShape,
  reference: Rectangle,
  outerWidth: number,
  side: "left" | "right",
  charge: Charge,
  path: string,
): PathBand {
  const { x, y, width, height } = reference;
  const { sx, syLow, syHigh } = transform(shape, reference, outerWidth, path);
  if (shape.kind === "empty")
    return Object.freeze({
      commands: Object.freeze([]),
      depth: () => {
        charge(1);
        return 0;
      },
    });
  const intrinsic = prepareCommands(shape.commands, shape.width, shape.height, side, charge, path);
  return Object.freeze({
    commands: shape.commands,
    depth(top: number, bottom: number) {
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom < top)
        fail("GEOMETRY", path, "Invalid PNG query band");
      charge(1);
      if (bottom < y || top > up(y + height)) return 0;
      const low = Math.max(0, Math.min(shape.height, down(down(top - y) / syHigh)));
      const high = Math.max(0, Math.min(shape.height, up(up(bottom - y) / syLow)));
      const depth = intrinsic.depth(low, high);
      if (depth === 0) return 0;
      const scaled = up(depth * sx);
      const result = side === "left" ? up(x + scaled) : up(up(up(outerWidth - x) - width) + scaled);
      if (!Number.isFinite(result)) fail("GEOMETRY", path, "Nonfinite PNG side projection");
      return Math.min(outerWidth, Math.max(0, result));
    },
  });
}
