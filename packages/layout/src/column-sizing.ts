import { fail, validateDataObject as record } from "@updf/core/internal";
import { type Sizing, sizing } from "./sizing.js";

export function columnInput(value: unknown, path: string): Record<string, unknown> {
  record(value, ["type", "children", "width", "style", "keepTogether"], path);
  if (value.type !== "column") fail("TYPE", path, "Row children must be Columns");
  for (const key of ["width", "style", "keepTogether"])
    if (key in value && value[key] === undefined) fail("TYPE", `${path}/${key}`, "Omit undefined fields");
  if ("keepTogether" in value && typeof value.keepTogether !== "boolean")
    fail("TYPE", path, "Expected boolean keepTogether");
  return value;
}
export function columnSizing(value: Record<string, unknown>, width: number, path: string): Sizing {
  if (value.style !== undefined) {
    if (value.style === null || typeof value.style !== "object")
      fail("TYPE", `${path}/style`, "Expected Column style data");
    record(value.style, Object.keys(value.style as object), `${path}/style`);
    for (const key of ["width", "minWidth", "maxWidth"])
      if (key in value.style) fail("KEY", `${path}/style/${key}`, "Column widths belong to the track");
  }
  return sizing(value.style, width, `${path}/style`);
}
