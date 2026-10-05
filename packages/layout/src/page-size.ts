import { number, validateDataObject } from "@updf/core/internal";

/** Positive finite dimensions in PDF points (72pt per inch). */
export interface PageDimensions {
  readonly width: number;
  readonly height: number;
}
/** Order short/long sides; omitting orientation preserves caller dimension order. */
export type Orientation = "portrait" | "landscape";
/** Convert positive finite dimensions to a frozen point pair; default pt, invalid units/overflow reject. */
export function pageSize(width: number, height: number, unit: "pt" | "mm" | "in" = "pt"): PageDimensions {
  number(width, "/size/width", true);
  number(height, "/size/height", true);
  const scale = unit === "mm" ? 72 / 25.4 : unit === "in" ? 72 : unit === "pt" ? 1 : NaN;
  number(scale, "/size/unit", true);
  number(width * scale, "/size/width", true);
  number(height * scale, "/size/height", true);
  return Object.freeze({ width: width * scale, height: height * scale });
}
/** Frozen portrait point presets A4, A5, Letter and Legal; apply orientation on Page/Flow props. */
export const PageSize = Object.freeze({
  A4: pageSize(210, 297, "mm"),
  A5: pageSize(148, 210, "mm"),
  Letter: pageSize(8.5, 11, "in"),
  Legal: pageSize(8.5, 14, "in"),
});
export function orientedSize(size: PageDimensions, orientation?: Orientation): PageDimensions {
  validateDataObject(size, ["width", "height"], "/size");
  const owned = pageSize(size.width, size.height);
  if (orientation === undefined) return owned;
  if (orientation !== "portrait" && orientation !== "landscape") number(NaN, "/orientation", true);
  const short = Math.min(owned.width, owned.height),
    long = Math.max(owned.width, owned.height);
  return Object.freeze(orientation === "landscape" ? { width: long, height: short } : { width: short, height: long });
}
