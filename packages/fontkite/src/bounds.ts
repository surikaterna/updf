import type { FontBounds } from "@updf/fonts";
import { roundedExtremum } from "./extremum.js";
import type { Contours, Point } from "./simple.js";

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true };
}

class Ink {
  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;
  point(point: Point): void {
    this.minX = Math.min(this.minX, point.x);
    this.maxX = Math.max(this.maxX, point.x);
    this.minY = Math.min(this.minY, point.y);
    this.maxY = Math.max(this.maxY, point.y);
  }
  curve(a: Point, b: Point, c: Point): void {
    this.point(a);
    this.point(c);
    const x = roundedExtremum(a.x, b.x, c.x),
      y = roundedExtremum(a.y, b.y, c.y);
    if (x !== undefined) {
      this.minX = Math.min(this.minX, x[0]);
      this.maxX = Math.max(this.maxX, x[1]);
    }
    if (y !== undefined) {
      this.minY = Math.min(this.minY, y[0]);
      this.maxY = Math.max(this.maxY, y[1]);
    }
  }
  bounds(): FontBounds {
    if (this.minX === Infinity) return [0, 0, 0, 0];
    return [Math.floor(this.minX), Math.floor(this.minY), Math.ceil(this.maxX), Math.ceil(this.maxY)];
  }
}

function contourBounds(contour: readonly Point[], ink: Ink): void {
  if (!contour.length) return;
  const first = contour[0]!,
    last = contour[contour.length - 1]!;
  const start = first.on ? first : last.on ? last : midpoint(first, last);
  let current = start,
    control: Point | undefined;
  ink.point(start);
  for (let i = first.on ? 1 : 0; i <= contour.length; i++) {
    const point = i === contour.length ? start : contour[i]!;
    if (point.on) {
      if (control) ink.curve(current, control, point);
      else ink.point(point);
      current = point;
      control = undefined;
    } else {
      if (control) {
        const middle = midpoint(control, point);
        ink.curve(current, control, middle);
        current = middle;
      }
      control = point;
    }
  }
}

export function outlineBounds(contours: Contours): FontBounds {
  const ink = new Ink();
  for (const contour of contours) contourBounds(contour, ink);
  return ink.bounds();
}
