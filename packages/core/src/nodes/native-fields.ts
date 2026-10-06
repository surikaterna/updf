import { fail } from "../core/error.js";
import { matrix, multiply } from "../painting/affine.js";

export function coordinate(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail("GEOMETRY", path, "Expected a finite translation coordinate");
  return value;
}

export function nativeFields(
  source: Readonly<Record<string, unknown>>,
  x: number,
  y: number,
  path: string,
  mode: "position" | "endpoints" | "matrix",
): Record<string, unknown> {
  const props = { ...source };
  if ("transform" in props && props.transform === undefined)
    fail("TYPE", `${path}/props/transform`, "Omit optional transform instead of undefined");
  if (mode === "matrix" || "transform" in props) {
    if (x || y || "transform" in props) props.transform = multiply([1, 0, 0, 1, x, y], matrix(props.transform, path));
    return props;
  }
  props.x = coordinate(props.x, `${path}/props/x`) + x;
  props.y = coordinate(props.y, `${path}/props/y`) + y;
  if (mode === "endpoints") {
    if ("x2" in props) props.x2 = coordinate(props.x2, `${path}/props/x2`) + x;
    if ("y2" in props) props.y2 = coordinate(props.y2, `${path}/props/y2`) + y;
  }
  return props;
}
