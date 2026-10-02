import { matrix } from "@updf/core/internal";
import type { Matrix } from "@updf/core/painting";
import { svgFail } from "./error.js";
import { attribute, numbers } from "./numbers.js";
import type { SVGTarget, XMLElement } from "./types.js";

export function viewBox(node: XMLElement): readonly [number, number, number, number] {
  const attr = node.attrs.viewBox;
  if (!attr) {
    const width = attribute(node, "width"),
      height = attribute(node, "height");
    if (width <= 0 || height <= 0)
      svgFail("SVG_GEOMETRY", node.path, "Without viewBox, positive intrinsic width/height are required", node.span);
    return [0, 0, width, height];
  }
  const values = numbers(attr.value, `${node.path}/@viewBox`, attr.span);
  const [x, y, width, height] = values;
  if (
    values.length !== 4 ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    width <= 0 ||
    height <= 0
  )
    svgFail(
      "SVG_GEOMETRY",
      `${node.path}/@viewBox`,
      "Expected four viewBox values with positive dimensions",
      attr.span,
    );
  return [x, y, width, height];
}
export function viewport(node: XMLElement, target: SVGTarget): Matrix {
  const box = viewBox(node);
  const preserve = node.attrs.preserveAspectRatio?.value.trim() ?? "xMidYMid meet";
  const sx = target.w / box[2],
    sy = target.h / box[3];
  if (preserve === "none") return matrix([sx, 0, 0, sy, -box[0] * sx, -box[1] * sy], `${node.path}/@viewBox`);
  const match = /^x(Min|Mid|Max)Y(Min|Mid|Max)(?:\s+(meet|slice))?$/.exec(preserve);
  if (!match)
    svgFail(
      "SVG_UNSUPPORTED",
      `${node.path}/@preserveAspectRatio`,
      "Unsupported preserveAspectRatio",
      node.attrs.preserveAspectRatio?.span ?? node.span,
    );
  const scale = match[3] === "slice" ? Math.max(sx, sy) : Math.min(sx, sy);
  const position = (key: string | undefined) => (key === "Min" ? 0 : key === "Max" ? 1 : 0.5);
  return matrix(
    [
      scale,
      0,
      0,
      scale,
      (target.w - box[2] * scale) * position(match[1]) - box[0] * scale,
      (target.h - box[3] * scale) * position(match[2]) - box[1] * scale,
    ],
    `${node.path}/@viewBox`,
  );
}
