import { paint } from "@updf/core/internal";
import { parseColor } from "@updf/geometry";
import { mapped, svgFail } from "./error.js";
import { length, numbers } from "./numbers.js";
import type { Declaration } from "./types.js";

export function validateDeclaration(entry: Declaration): void {
  const { name, value, path, span } = entry;
  if (value === "inherit") return;
  try {
    if (name === "fill" || name === "stroke") {
      parseColor(value);
      return;
    }
    if (name === "opacity" || name.endsWith("-opacity")) {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || Number(value) > 1)
        svgFail("SVG_STYLE", path, "Opacity must be 0..1", span);
      if (name === "opacity" && Number(value) !== 1)
        svgFail("SVG_UNSUPPORTED", path, "Group/element opacity other than1 is unsupported", span);
      return;
    }
    if (name === "visibility" || name === "display") {
      if (!(name === "visibility" ? ["visible", "hidden", "collapse"] : ["inline", "none"]).includes(value))
        svgFail("SVG_UNSUPPORTED", path, "Unsupported visibility/display", span);
      return;
    }
    const fields: Readonly<Record<string, string>> = {
      "fill-rule": "fillRule",
      "stroke-linecap": "lineCap",
      "stroke-linejoin": "lineJoin",
      "stroke-width": "width",
      "stroke-miterlimit": "miterLimit",
      "stroke-dashoffset": "dashOffset",
      "stroke-dasharray": "dash",
    };
    const field = fields[name];
    if (!field) svgFail("SVG_UNSUPPORTED", path, "Unsupported CSS property", span);
    const parsed =
      name === "stroke-dasharray"
        ? value === "none"
          ? []
          : numbers(value, path, span)
        : ["stroke-width", "stroke-miterlimit", "stroke-dashoffset"].includes(name)
          ? length(value, path, span)
          : value;
    paint({ [field]: parsed }, "path", path);
  } catch (error: unknown) {
    mapped(error, path, span);
  }
}
