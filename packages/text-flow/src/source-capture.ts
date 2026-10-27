import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import { Source, type ShapeSource } from "./sources.js";

/** Forged data is allowed only after the same strict snapshot validation as builder data. */
export function captureSource(input: unknown, path: string): ShapeSource | string {
  if (typeof input === "string") return input;
  validateDataObject(input, ["kind", "src", "d", "points", "fillRule"], path);
  const kind = ownDataValue(input, "kind", `${path}/kind`);
  const options = Object.hasOwn(input, "fillRule")
    ? { fillRule: ownDataValue(input, "fillRule", `${path}/fillRule`) as never }
    : {};
  try {
    if (kind === "url") {
      validateDataObject(input, ["kind", "src"], path);
      return Source.url(ownDataValue(input, "src", `${path}/src`) as string);
    }
    if (kind === "path") {
      validateDataObject(input, ["kind", "d", "fillRule"], path);
      return Source.path(ownDataValue(input, "d", `${path}/d`) as string, options);
    }
    if (kind === "polygon") {
      validateDataObject(input, ["kind", "points", "fillRule"], path);
      return Source.polygon(ownDataValue(input, "points", `${path}/points`) as number[], options);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    fail("VALUE", path, error.message);
  }
  return fail("VALUE", path, "Expected a tagged Source descriptor");
}
