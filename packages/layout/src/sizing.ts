import { array, fail, number, validateDataObject as record, snapshotData, sum } from "@updf/core/internal";
import { derivedAxis } from "./axis.js";
import type { BlockStyle, Insets } from "./container-types.js";

const keys = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "padding",
  "border",
  "background",
  "gap",
  "overflow",
];
const zero: Insets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
export interface Sizing {
  readonly style: BlockStyle;
  readonly width: number;
  readonly contentWidth: number;
  readonly inset: Insets;
  readonly vertical: number;
  readonly gap: number;
}
function rgb(value: unknown, path: string): void {
  if (!Array.isArray(value) || value.length !== 3) fail("GEOMETRY", path, "Expected RGB tuple");
  array(value, 3, path);
  for (const component of value) if (number(component, path) > 1) fail("GEOMETRY", path, "RGB must be in [0,1]");
}
export function clamp(value: number, min: number | undefined, max: number | undefined): number {
  return Math.max(min ?? 0, Math.min(value, max ?? value));
}
export function sizing(input: unknown, available: number, path: string): Sizing {
  const value = input === undefined ? {} : input;
  record(value, keys, path);
  for (const key of keys.slice(0, 6)) if (key in value) number(value[key], `${path}/${key}`, key === "width");
  for (const axis of ["Width", "Height"]) {
    const min = value[`min${axis}`],
      max = value[`max${axis}`];
    if (typeof min === "number" && typeof max === "number" && min > max)
      fail("GEOMETRY", path, "Contradictory min/max");
  }
  const style = value as BlockStyle;
  if ("overflow" in style && style.overflow !== "error" && style.overflow !== "hidden")
    fail("TYPE", path, "Expected error or hidden overflow");
  if ("border" in style) {
    record(style.border, ["width", "color"], `${path}/border`);
    number(style.border.width, path);
    rgb(style.border.color, path);
  }
  if ("background" in style) rgb(style.background, path);
  const padding = "padding" in style ? style.padding : zero;
  record(padding, ["top", "right", "bottom", "left"], `${path}/padding`);
  const border = style.border?.width ?? 0;
  const inset = {
    top: sum([number(padding.top, path), border]),
    right: sum([number(padding.right, path), border]),
    bottom: sum([number(padding.bottom, path), border]),
    left: sum([number(padding.left, path), border]),
  };
  const width = clamp(style.width ?? available, style.minWidth, style.maxWidth);
  if (width <= 0 || width > available)
    fail("GEOMETRY", path, "Border box width must fit its available region without shrinking");
  const horizontal = derivedAxis(inset.left, width - inset.right, path);
  return {
    style: snapshotData(style, path),
    width,
    inset,
    contentWidth: horizontal.capacity,
    vertical: sum([inset.top, inset.bottom]),
    gap: number("gap" in style ? style.gap : 0, path),
  };
}
