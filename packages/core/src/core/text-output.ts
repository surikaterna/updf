import { ownDataValue } from "./data.js";
import { fail } from "./error.js";
import { array, finite, number, validateDataObject } from "./schema.js";
import type { TextService } from "./text-service.js";

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("TYPE", path, "Expected text output record");
  validateDataObject(value, Object.keys(value), path);
  return Object.assign(Object.create(null), value);
}
function field(value: Record<string, unknown>, key: string, path: string, nonnegative = false): void {
  const item = ownDataValue(value, key, `${path}/${key}`);
  if (nonnegative) number(item, `${path}/${key}`);
  else finite(item, `${path}/${key}`);
}
function count(value: Record<string, unknown>, key: string, path: string): number {
  const item = number(ownDataValue(value, key, `${path}/${key}`), `${path}/${key}`);
  if (!Number.isSafeInteger(item)) fail("GEOMETRY", `${path}/${key}`, "Expected nonnegative safe integer");
  return item;
}
function style(value: unknown, path: string): void {
  const result = record(value, path);
  if (typeof result.font !== "string") fail("TYPE", `${path}/font`, "Expected font reference");
  number(result.fontSize, `${path}/fontSize`, true);
  array(result.color, 3, `${path}/color`);
  if (result.color.length !== 3) fail("TYPE", `${path}/color`, "Expected RGB triple");
  result.color.forEach((item, i) => {
    if (number(item, `${path}/color/${i}`) > 1) fail("VALUE", `${path}/color/${i}`, "RGB must be 0..1");
  });
}
function bounds(value: unknown, path: string): void {
  const result = record(value, path);
  if (typeof result.empty !== "boolean") fail("TYPE", `${path}/empty`, "Expected boolean");
  if (result.empty) return;
  for (const key of ["left", "right", "top", "bottom"]) field(result, key, path);
  if ((result.left as number) > (result.right as number) || (result.top as number) > (result.bottom as number))
    fail("GEOMETRY", path, "Inverted text ink bounds");
}
function fragments(value: unknown, path: string, positioned: boolean): void {
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
function measurement(value: unknown, path: string): void {
  const result = record(value, path);
  field(result, "width", path, true);
  field(result, "consumedHeight", path, true);
  const lineCount = count(result, "lineCount", path);
  array(result.lines, Number.MAX_SAFE_INTEGER, `${path}/lines`);
  if (lineCount !== result.lines.length) fail("GEOMETRY", `${path}/lineCount`, "Invalid line count");
  result.lines.forEach((value, i) => {
    const at = `${path}/lines/${i}`;
    const line = record(value, at);
    count(line, "paragraphIndex", at);
    for (const key of ["top", "height", "advance"]) field(line, key, at, true);
    field(line, "baseline", at);
    bounds(line.inkBounds, `${at}/inkBounds`);
    fragments(line.fragments, `${at}/fragments`, false);
    if (!["hard", "soft", "paragraphEnd"].includes(line.breakReason as string))
      fail("VALUE", `${at}/breakReason`, "Expected line break reason");
  });
}
export function validateTextOutput(key: keyof TextService, value: unknown, path: string): void {
  if (key === "resolveStyle") style(value, path);
  if (key === "measure") measurement(value, path);
  if (key === "rich") fragments(record(value, path).fragments, `${path}/fragments`, true);
  if (key === "lineBox") {
    const result = record(value, path);
    field(result, "above", path);
    field(result, "below", path);
    field(result, "height", path, true);
  }
  if (key === "fixed") fixed(value, path);
  if (key === "inline" || key === "fixedInk") {
    array(value, Number.MAX_SAFE_INTEGER, path);
    value.forEach((item, i) => {
      if (key === "fixedInk") bounds(item, `${path}/${i}`);
      else inline(item, `${path}/${i}`);
    });
  }
}
function inline(value: unknown, path: string): void {
  const result = record(value, path);
  measurement({ width: 0, consumedHeight: 0, lineCount: 1, lines: [result.line] }, path);
  const line = record(result.line, `${path}/line`);
  array(line.fragments, Number.MAX_SAFE_INTEGER, `${path}/line/fragments`);
  for (const key of ["nativeTops", "nativeHeights", "nativeWidths", "nativePads"]) {
    const values = result[key];
    array(values, Number.MAX_SAFE_INTEGER, `${path}/${key}`);
    if (values.length !== line.fragments.length) fail("GEOMETRY", `${path}/${key}`, "Expected one value per fragment");
    values.forEach((item, i) => {
      if (key === "nativeTops") finite(item, `${path}/${key}/${i}`);
      else number(item, `${path}/${key}/${i}`);
    });
  }
}
function fixed(value: unknown, path: string): void {
  const result = record(value, path);
  array(result.lines, Number.MAX_SAFE_INTEGER, `${path}/lines`);
  result.lines.forEach((value, i) => {
    const at = `${path}/lines/${i}`;
    const line = record(value, at);
    for (const key of ["x", "y"]) field(line, key, at);
    if (typeof line.text !== "string" || typeof line.path !== "string")
      fail("TYPE", at, "Expected text and diagnostic path");
    if (!line.run || typeof line.run !== "object") fail("FONT_RESOURCE", `${at}/run`, "Expected opaque text run");
  });
}
