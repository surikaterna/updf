import { fail, ownDataValue, validateDataObject } from "@updf/core/internal";
import { isOwnedResource } from "@updf/core/resources";
import type { ImageProps, PreparedImage } from "./types.js";

export function imageSource(value: unknown, path: string): PreparedImage {
  if (!isOwnedResource(value)) fail("TYPE", path, "Image src requires an owned prepared PNG or JPEG");
  const metadata = ownDataValue(value, "metadata", `${path}/metadata`);
  if (!metadata || typeof metadata !== "object") fail("TYPE", path, "Expected prepared image metadata");
  const fields = metadata as Readonly<Record<string, unknown>>;
  const kind = ownDataValue(fields, "kind", `${path}/metadata/kind`);
  if (kind !== "png" && kind !== "jpeg") fail("TYPE", path, "Image src requires a prepared PNG or JPEG, not a font");
  for (const axis of ["width", "height"]) {
    const pixels = ownDataValue(fields, axis, `${path}/metadata/${axis}`);
    if (typeof pixels !== "number" || !Number.isSafeInteger(pixels) || pixels <= 0)
      fail("GEOMETRY", `${path}/metadata/${axis}`, "Expected positive safe integer pixel dimension");
  }
  return value as PreparedImage;
}

/** Declaration validation does not grant transport or prepared-resource authority. */
export function declaredSource(value: unknown, path: string): ImageProps["src"] {
  if (isOwnedResource(value)) return imageSource(value, path);
  if (typeof value === "string") return url(value, path);
  validateDataObject(value, ["kind", "src"], path);
  const fields = value as Readonly<Record<string, unknown>>;
  if (ownDataValue(fields, "kind", `${path}/kind`) !== "url")
    fail("TYPE", `${path}/kind`, "Expected URL image source kind");
  return Object.freeze({ kind: "url", src: url(ownDataValue(fields, "src", `${path}/src`), `${path}/src`) });
}

function url(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) fail("TYPE", path, "Expected nonempty URL string");
  return value;
}

export function sourceUrl(source: ImageProps["src"]): string | undefined {
  if (isOwnedResource(source)) return undefined;
  if (typeof source === "string") return source;
  return ownDataValue(source, "kind", "/images/src/kind") === "url"
    ? url(ownDataValue(source, "src", "/images/src/src"), "/images/src/src")
    : undefined;
}
