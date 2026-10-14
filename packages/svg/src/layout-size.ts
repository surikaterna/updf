import { fail, number, validateDataObject as record } from "@updf/core/internal";
import type { PreparedPainting } from "./compile.js";
import { mapped, svgFail } from "./error.js";

/** Explicit point viewport; omitted dimensions use prepared source metadata, never available flow width. */
export interface SvgSize {
  readonly width?: number;
  readonly height?: number;
}
export function svgSize(painting: PreparedPainting, input: SvgSize): { width: number; height: number } {
  try {
    record(input, ["width", "height"], "/size");
    for (const key of ["width", "height"] as const)
      if (key in input && input[key] === undefined) fail("TYPE", `/size/${key}`, "Omit undefined dimensions");
    const width = "width" in input ? number(input.width, "/size/width", true) : undefined;
    const height = "height" in input ? number(input.height, "/size/height", true) : undefined;
    if (width !== undefined && height !== undefined) return { width, height };
    if (width === undefined && height === undefined) {
      if (painting.intrinsicWidth > 0 && painting.intrinsicHeight > 0)
        return { width: painting.intrinsicWidth, height: painting.intrinsicHeight };
      svgFail("SVG_GEOMETRY", "/SVG_VIEWPORT", "Supply a viewport when positive intrinsic width/height are absent");
    }
    const w = width ?? (height as number) * (painting.viewport.box[2] / painting.viewport.box[3]);
    const h = height ?? (width as number) * (painting.viewport.box[3] / painting.viewport.box[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
      svgFail("SVG_GEOMETRY", "/SVG_VIEWPORT", "Derived viewport dimensions must be positive and finite");
    return { width: w, height: h };
  } catch (error: unknown) {
    mapped(error, "/SVG_VIEWPORT");
  }
}
