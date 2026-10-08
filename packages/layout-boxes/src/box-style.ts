import type { BoxStyle } from "./box-types.js";
import { fail } from "./error.js";
import { number, record } from "./width-validation.js";

const keys = [
  "flexDirection",
  "width",
  "minWidth",
  "maxWidth",
  "flexGrow",
  "flexBasis",
  "height",
  "minHeight",
  "maxHeight",
  "overflow",
  "gap",
  "alignItems",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
];
export function boxStyle(input: unknown, path: string): BoxStyle {
  const data = record(input, keys, path);
  for (const key of Object.keys(data)) {
    const value = data[key];
    if (value === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
    if (key !== "flexDirection" && key !== "alignItems" && key !== "overflow")
      number(value, `${path}/${key}`, key === "width" || key === "flexGrow");
  }
  if ("overflow" in data && data.overflow !== "error" && data.overflow !== "clip")
    fail("TYPE", `${path}/overflow`, "Expected error or clip");
  validateFlex(data, path);
  for (const axis of ["Width", "Height"]) {
    const min = data[`min${axis}`],
      max = data[`max${axis}`];
    if (typeof min === "number" && typeof max === "number" && min > max)
      fail("GEOMETRY", path, "Contradictory min/max");
  }
  return Object.freeze(data) as BoxStyle;
}
function validateFlex(data: Record<string, unknown>, path: string): void {
  if ("flexDirection" in data && data.flexDirection !== "row" && data.flexDirection !== "column")
    fail("TYPE", path, "Expected row or column");
  if ("alignItems" in data && !["start", "center", "end", "stretch"].includes(data.alignItems as string))
    fail("TYPE", path, "Invalid box alignment");
  if (data.flexBasis !== undefined && data.flexBasis !== 0) fail("VALUE", path, "Only flexBasis 0 is supported");
  if (data.width !== undefined && (data.flexGrow !== undefined || data.flexBasis !== undefined))
    fail("VALUE", path, "Fixed width conflicts with flex sizing");
  if ((data.flexDirection ?? "column") === "column" && (data.alignItems ?? "start") !== "start")
    fail("VALUE", path, "Column alignment must be start");
}
export function clampSize(value: number, min?: number, max?: number): number {
  return Math.max(min ?? 0, Math.min(value, max ?? value));
}
