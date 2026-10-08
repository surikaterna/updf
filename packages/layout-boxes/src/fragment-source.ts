import { exceeds } from "./arithmetic.js";
import { fail } from "./error.js";
import type { FragmentSource, RangeRequest } from "./fragment-types.js";
import { number, record, trackLimit } from "./width-validation.js";

export function safeInteger(value: unknown, path: string): number {
  if (typeof value !== "number") fail("TYPE", path, "Expected safe integer");
  trackLimit(value, path);
  return value;
}
export function sourceSnapshot<D>(input: FragmentSource<D>): FragmentSource<D> {
  const data = record(input, ["id", "path", "descriptor", "extent", "mode", "width"], "/source");
  if (typeof data.id !== "string" || !data.id || typeof data.path !== "string")
    fail("TYPE", "/source", "Expected source identity and path");
  if (!Object.hasOwn(data, "descriptor")) fail("TYPE", "/source/descriptor", "Expected descriptor");
  if (data.mode !== "atomic" && data.mode !== "splittable") fail("VALUE", data.path, "Expected fragmentation mode");
  const width = record(data.width, ["mode", "value"], `${data.path}/width`);
  if (width.mode !== "fixed" && width.mode !== "reflow") fail("VALUE", data.path, "Expected width mode");
  if (width.mode === "reflow" && Object.hasOwn(width, "value")) fail("KEY", data.path, "Reflow width has no value");
  const ownedWidth =
    width.mode === "fixed"
      ? Object.freeze({ mode: "fixed" as const, value: number(width.value, data.path) })
      : Object.freeze({ mode: "reflow" as const });
  return Object.freeze({
    id: data.id,
    path: data.path,
    descriptor: data.descriptor as D,
    extent: safeInteger(data.extent, data.path),
    mode: data.mode,
    width: ownedWidth,
  });
}
export function rangeRequest(input: RangeRequest): RangeRequest {
  const data = record(input, ["offset", "width", "height", "usedHeight"], "/request");
  const height = number(data.height, "/request/height");
  const usedHeight = number(data.usedHeight, "/request/usedHeight");
  if (exceeds(usedHeight, height)) fail("GEOMETRY", "/request/usedHeight", "Used height exceeds region height");
  return Object.freeze({
    offset: safeInteger(data.offset, "/request/offset"),
    width: number(data.width, "/request/width"),
    height,
    usedHeight,
  });
}
