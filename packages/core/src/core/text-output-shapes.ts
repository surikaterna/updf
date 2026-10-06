import { ownDataValue } from "./data.js";
import { fail } from "./error.js";
import { array, finite, number, validateDataObject } from "./schema.js";

export function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected text output record");
  validateDataObject(value, Object.keys(value), path);
  return Object.assign(Object.create(null), value);
}
export function field(value: Record<string, unknown>, key: string, path: string, nonnegative = false): void {
  const item = ownDataValue(value, key, `${path}/${key}`);
  if (nonnegative) number(item, `${path}/${key}`);
  else finite(item, `${path}/${key}`);
}
export function count(value: Record<string, unknown>, key: string, path: string): number {
  const item = number(ownDataValue(value, key, `${path}/${key}`), `${path}/${key}`);
  if (!Number.isSafeInteger(item)) fail("GEOMETRY", `${path}/${key}`, "Expected nonnegative safe integer");
  return item;
}
export function style(value: unknown, path: string): void {
  const result = record(value, path);
  if (typeof result.font !== "string") fail("TYPE", `${path}/font`, "Expected font reference");
  number(result.fontSize, `${path}/fontSize`, true);
  array(result.color, 3, `${path}/color`);
  if (result.color.length !== 3) fail("TYPE", `${path}/color`, "Expected RGB triple");
  result.color.forEach((item, i) => {
    if (number(item, `${path}/color/${i}`) > 1) fail("VALUE", `${path}/color/${i}`, "RGB must be 0..1");
  });
}
export function bounds(value: unknown, path: string): void {
  const result = record(value, path);
  if (typeof result.empty !== "boolean") fail("TYPE", `${path}/empty`, "Expected boolean");
  if (result.empty) return;
  for (const key of ["left", "right", "top", "bottom"]) field(result, key, path);
  if ((result.left as number) > (result.right as number) || (result.top as number) > (result.bottom as number))
    fail("GEOMETRY", path, "Inverted text ink bounds");
}
export function fragments(value: unknown, path: string, positioned: boolean): void {
  array(value, Number.MAX_SAFE_INTEGER, path);
  value.forEach((value, i) => {
    const at = `${path}/${i}`;
    const item = record(value, at);
    field(item, "x", at);
    field(item, "advance", at, true);
    count(item, "runIndex", at);
    if (typeof item.text !== "string") fail("TYPE", `${at}/text`, "Expected text");
    style(item.style, `${at}/style`);
    const source = record(item.source, `${at}/source`);
    if (count(source, "start", `${at}/source`) > count(source, "end", `${at}/source`))
      fail("GEOMETRY", `${at}/source`, "Inverted source span");
    bounds(item.inkBounds, `${at}/inkBounds`);
    if (positioned) {
      field(item, "baseline", at);
      if (!item.run || typeof item.run !== "object") fail("FONT_RESOURCE", `${at}/run`, "Expected opaque text run");
      if (typeof item.path !== "string") fail("TYPE", `${at}/path`, "Expected diagnostic path");
    }
  });
}
