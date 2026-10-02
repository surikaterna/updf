import { fail } from "../core/error.js";
import { array, finite, number, record } from "../core/schema.js";
import type { ResolvedPaint, RGB } from "./types.js";

const black: RGB = Object.freeze([0, 0, 0]);
function unit(value: unknown, path: string): number {
  const result = number(value, path);
  if (result > 1) fail("PAINT", path, "Color/opacity components must be 0..1");
  return result;
}
function color(value: unknown, path: string): RGB | null {
  if (value === null) return null;
  array(value, 3, path);
  if (value.length !== 3) fail("PAINT", path, "Expected three RGB components");
  return Object.freeze([unit(value[0], path), unit(value[1], path), unit(value[2], path)]);
}
function choice<T extends string>(value: unknown, values: readonly T[], fallback: T, path: string): T {
  if (value === undefined) return fallback;
  for (const item of values) if (value === item) return item;
  fail("PAINT", path, "Unsupported paint choice");
}
function dash(value: unknown, path: string): readonly number[] {
  if (value === undefined) return Object.freeze([]);
  array(value, 128, path);
  const result = value.map((item, i) => number(item, `${path}/${i}`));
  if (result.length && result.every((item) => item === 0)) fail("PAINT", path, "Dash cannot be all zero");
  return Object.freeze(result.length % 2 ? [...result, ...result] : result);
}
export function paint(value: unknown, kind: "path" | "rect" | "line", path: string): ResolvedPaint {
  const props = value === undefined ? {} : value;
  record(
    props,
    [
      "fill",
      "stroke",
      "fillOpacity",
      "strokeOpacity",
      "width",
      "fillRule",
      "lineCap",
      "lineJoin",
      "miterLimit",
      "dash",
      "dashOffset",
    ],
    path,
  );
  for (const key of Object.keys(props))
    if (props[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit optional paint fields instead of undefined");
  const dashes = dash(props.dash, `${path}/dash`);
  const period = finite(
    dashes.reduce((sum, item) => sum + item, 0),
    `${path}/dash`,
  );
  const offset = "dashOffset" in props ? finite(props.dashOffset, `${path}/dashOffset`) : 0;
  const remainder = period ? offset % period : 0;
  // Never add the period to an already positive remainder: finite large values
  // can overflow even when the mathematically normalized result is finite.
  const normalizedOffset = remainder < 0 ? remainder + period : remainder;
  const miter = "miterLimit" in props ? number(props.miterLimit, `${path}/miterLimit`, true) : 10;
  if (miter < 1) fail("PAINT", `${path}/miterLimit`, "Miter limit must be at least 1");
  return Object.freeze({
    fill: "fill" in props ? color(props.fill, `${path}/fill`) : kind === "path" ? black : null,
    stroke: "stroke" in props ? color(props.stroke, `${path}/stroke`) : kind === "path" ? null : black,
    fillOpacity: "fillOpacity" in props ? unit(props.fillOpacity, `${path}/fillOpacity`) : 1,
    strokeOpacity: "strokeOpacity" in props ? unit(props.strokeOpacity, `${path}/strokeOpacity`) : 1,
    width: "width" in props ? number(props.width, `${path}/width`) : kind === "path" ? 1 : 0.5,
    fillRule: choice(props.fillRule, ["nonzero", "evenodd"], "nonzero", path),
    lineCap: choice(props.lineCap, ["butt", "round", "square"], "butt", path),
    lineJoin: choice(props.lineJoin, ["miter", "round", "bevel"], "miter", path),
    miterLimit: miter,
    dash: dashes,
    dashOffset: finite(normalizedOffset === period ? 0 : normalizedOffset, `${path}/dashOffset`),
  });
}
