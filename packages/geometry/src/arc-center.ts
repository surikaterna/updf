// Adapted Fontello/svgpath a2c math; Copyright2013-2015 Vitaly Puzrin, MIT.
// See LICENSE.svgpath and REUSE.md for exact source/revision.
export function unitVectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = Math.max(-1, Math.min(1, ux * vx + uy * vy));
  return sign * Math.acos(dot);
}
export function arcCenter(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  large: number,
  sweep: number,
  rx: number,
  ry: number,
  sine: number,
  cosine: number,
): readonly [number, number, number, number] {
  const xp = (cosine * (x1 - x2)) / 2 + (sine * (y1 - y2)) / 2;
  const yp = (-sine * (x1 - x2)) / 2 + (cosine * (y1 - y2)) / 2;
  const rx2 = rx * rx,
    ry2 = ry * ry,
    xp2 = xp * xp,
    yp2 = yp * yp;
  const factor =
    Math.sqrt(Math.max(0, (rx2 * ry2 - rx2 * yp2 - ry2 * xp2) / (rx2 * yp2 + ry2 * xp2))) * (large === sweep ? -1 : 1);
  const cxp = ((factor * rx) / ry) * yp,
    cyp = ((factor * -ry) / rx) * xp;
  const cx = cosine * cxp - sine * cyp + (x1 + x2) / 2;
  const cy = sine * cxp + cosine * cyp + (y1 + y2) / 2;
  const ux = (xp - cxp) / rx,
    uy = (yp - cyp) / ry;
  const vx = (-xp - cxp) / rx,
    vy = (-yp - cyp) / ry;
  const start = unitVectorAngle(1, 0, ux, uy);
  let delta = unitVectorAngle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  return [cx, cy, start, delta];
}
export function unitArc(start: number, delta: number): readonly [number, number, number, number, number, number] {
  const alpha = (4 / 3) * Math.tan(delta / 4);
  const x1 = Math.cos(start),
    y1 = Math.sin(start),
    x2 = Math.cos(start + delta),
    y2 = Math.sin(start + delta);
  return [x1 - y1 * alpha, y1 + x1 * alpha, x2 + y2 * alpha, y2 - x2 * alpha, x2, y2];
}
