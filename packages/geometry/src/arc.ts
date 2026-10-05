// Adapted Fontello/svgpath a2c, MIT; attribution/license in LICENSE.svgpath.
import { fail, finite } from "@updf/core/internal";
import type { PathCommand } from "@updf/core/painting";
import { arcCenter, unitArc } from "./arc-center.js";

/**
 * Convert an SVG endpoint arc to cubic commands, without a leading move command.
 * Coordinates/radii use the caller's painting units; rotation is degrees and flags
 * must be 0 or 1. Negative radii become absolute, undersized radii expand to fit.
 * Coincident endpoints yield no commands; zero radii yield a line. Invalid or
 * nonfinite geometry throws DocumentError. Readonly typing does not imply freezing.
 */
export function arc(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rxInput: number,
  ryInput: number,
  rotation: number,
  large: number,
  sweep: number,
): readonly PathCommand[] {
  for (const value of [x1, y1, x2, y2, rxInput, ryInput, rotation]) finite(value, "/arc");
  if ((large !== 0 && large !== 1) || (sweep !== 0 && sweep !== 1))
    fail("PATH_SYNTAX", "/arc", "Arc flags must be 0 or 1");
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxInput),
    ry = Math.abs(ryInput);
  if (!rx || !ry) return [{ type: "line", x: x2, y: y2 }];
  const sine = Math.sin((rotation * Math.PI) / 180),
    cosine = Math.cos((rotation * Math.PI) / 180);
  const xp = (cosine * (x1 - x2)) / 2 + (sine * (y1 - y2)) / 2;
  const yp = (-sine * (x1 - x2)) / 2 + (cosine * (y1 - y2)) / 2;
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const center = arcCenter(x1, y1, x2, y2, large, sweep, rx, ry, sine, cosine);
  for (const value of center) finite(value, "/arc");
  const count = Math.max(Math.ceil(Math.abs(center[3]) / (Math.PI / 2)), 1);
  const delta = center[3] / count;
  const map = (x: number, y: number): readonly [number, number] => [
    finite(cosine * x * rx - sine * y * ry + center[0], "/arc"),
    finite(sine * x * rx + cosine * y * ry + center[1], "/arc"),
  ];
  return Array.from({ length: count }, (_, i): PathCommand => {
    const unit = unitArc(center[2] + i * delta, delta);
    const c1 = map(unit[0], unit[1]),
      c2 = map(unit[2], unit[3]),
      end = map(unit[4], unit[5]);
    return cubic(c1, c2, i === count - 1 ? [x2, y2] : end);
  });
}

function cubic(
  c1: readonly [number, number],
  c2: readonly [number, number],
  end: readonly [number, number],
): PathCommand {
  return { type: "cubic", x1: c1[0], y1: c1[1], x2: c2[0], y2: c2[1], x: end[0], y: end[1] };
}
