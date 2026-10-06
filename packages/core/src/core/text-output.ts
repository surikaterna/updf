import { fail } from "./error.js";
import { array, finite, number } from "./schema.js";
import { validateMeasurement } from "./text-measurement-output.js";
import { bounds, field, fragments, record } from "./text-output-shapes.js";

export function validateRich(value: unknown, path: string): void {
  fragments(record(value, path).fragments, `${path}/fragments`, true);
}
export function validateLineBox(value: unknown, path: string): void {
  const result = record(value, path);
  field(result, "above", path);
  field(result, "below", path);
  field(result, "height", path, true);
}
export function validateInline(value: unknown, path: string): void {
  array(value, Number.MAX_SAFE_INTEGER, path);
  value.forEach((item, i) => {
    inline(item, `${path}/${i}`);
  });
}
export function validateFixedInk(value: unknown, path: string): void {
  array(value, Number.MAX_SAFE_INTEGER, path);
  value.forEach((item, i) => {
    bounds(item, `${path}/${i}`);
  });
}
function inline(value: unknown, path: string): void {
  const result = record(value, path);
  validateMeasurement({ width: 0, consumedHeight: 0, lineCount: 1, lines: [result.line] }, path);
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
export function validateFixed(value: unknown, path: string): void {
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
