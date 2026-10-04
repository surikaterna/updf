import { array, fail, number, validateDataObject as record, snapshotData, sum } from "@updf/core/internal";
import { derivedAxis } from "./axis.js";
import { borderKeys, type ExpandedBorders, expandBorders } from "./borders.js";
import type { BlockStyle, Insets } from "./container-types.js";

const keys = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  ...borderKeys,
  "backgroundColor",
  "gap",
  "overflow",
  "marginTop",
];
export interface Sizing {
  readonly style: BlockStyle;
  readonly borders: ExpandedBorders;
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
  if ("marginTop" in style && style.marginTop !== "auto")
    fail("VDOM_HIERARCHY", `${path}/marginTop`, "Expected auto top margin");
  if ("overflow" in style && style.overflow !== "error" && style.overflow !== "hidden")
    fail("TYPE", path, "Expected error or hidden overflow");
  const borders = expandBorders(
    Object.fromEntries(borderKeys.filter((key) => key in value).map((key) => [key, value[key]])),
    path,
  );
  if ("backgroundColor" in style) rgb(style.backgroundColor, `${path}/backgroundColor`);
  for (const key of ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const)
    if (key in style) number(style[key], `${path}/${key}`);
  const padding = style.padding ?? 0;
  const inset = {
    top: sum([style.paddingTop ?? padding, borders.borderTop?.width ?? 0]),
    right: sum([style.paddingRight ?? padding, borders.borderRight?.width ?? 0]),
    bottom: sum([style.paddingBottom ?? padding, borders.borderBottom?.width ?? 0]),
    left: sum([style.paddingLeft ?? padding, borders.borderLeft?.width ?? 0]),
  };
  const width = clamp(style.width ?? available, style.minWidth, style.maxWidth);
  if (width <= 0 || width > available)
    fail("GEOMETRY", path, "Border box width must fit its available region without shrinking");
  const horizontal = derivedAxis(inset.left, width - inset.right, path);
  return {
    style: snapshotData(style, path),
    borders,
    width,
    inset,
    contentWidth: horizontal.capacity,
    vertical: sum([inset.top, inset.bottom]),
    gap: number("gap" in style ? style.gap : 0, path),
  };
}
