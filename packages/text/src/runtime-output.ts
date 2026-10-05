import { dataRecord, fail, finite, number, ownDataValue } from "@updf/core/internal";
import type { TextMetrics } from "@updf/core/resources";

export function intrinsicMetrics(value: unknown, path: string): TextMetrics {
  dataRecord(value, path);
  const result = Object.create(null) as TextMetrics;
  for (const key of ["advance", "left", "right", "ascent", "descent", "top", "bottom"] as const) {
    const item = ownDataValue(value, key, `${path}/${key}`);
    const checked = ["advance", "ascent", "descent"].includes(key)
      ? number(item, `${path}/${key}`)
      : finite(item, `${path}/${key}`);
    Object.defineProperty(result, key, { value: checked, enumerable: true });
  }
  const empty = ownDataValue(value, "empty", `${path}/empty`);
  if (typeof empty !== "boolean") fail("TYPE", `${path}/empty`, "Expected boolean");
  if (!empty && (result.left > result.right || result.top > result.bottom))
    fail("GEOMETRY", path, "Inverted intrinsic ink bounds");
  const run = ownDataValue(value, "run", `${path}/run`);
  if (!run || typeof run !== "object") fail("FONT_RESOURCE", `${path}/run`, "Expected opaque text run");
  return Object.freeze(Object.assign(result, { empty, run }));
}

export function intrinsicLineMetrics(
  value: unknown,
  path: string,
): { readonly ascent: number; readonly descent: number } {
  dataRecord(value, path);
  return Object.freeze({
    ascent: number(ownDataValue(value, "ascent", `${path}/ascent`), `${path}/ascent`),
    descent: number(ownDataValue(value, "descent", `${path}/descent`), `${path}/descent`),
  });
}
