import { decimal as n } from "../core/pdf-values.js";
import type { PageResources } from "../core/resource-types.js";
import { multiply } from "./affine.js";
import { alphaAt } from "./alpha.js";
import type { PathCommand, ResolvedDrawing, ResolvedPaint } from "./types.js";

function operation(paint: ResolvedPaint): string {
  const stroke = paint.stroke && paint.width > 0;
  if (paint.fill && stroke) return paint.fillRule === "evenodd" ? "B*" : "B";
  if (paint.fill) return paint.fillRule === "evenodd" ? "f*" : "f";
  return stroke ? "S" : "n";
}
function path(command: PathCommand): string {
  if (command.type === "close") return "h\n";
  if (command.type === "cubic")
    return `${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${n(command.y2)} ${n(command.x)} ${n(command.y)} c\n`;
  return `${n(command.x)} ${n(command.y)} ${command.type === "move" ? "m" : "l"}\n`;
}
export function painted(
  drawing: ResolvedDrawing,
  height: number,
  local: boolean,
  resources: PageResources,
): readonly string[] {
  const paint = drawing.paint;
  const matrix = local ? drawing.matrix : multiply([1, 0, 0, -1, 0, height], drawing.matrix);
  const alpha = alphaAt(resources, drawing);
  return [
    "q\n",
    `${matrix.map(n).join(" ")} cm\n`,
    ...(alpha ? [`/${alpha} gs\n`] : []),
    ...(paint.fill ? [`${paint.fill.map(n).join(" ")} rg\n`] : []),
    ...(paint.stroke && paint.width ? [`${paint.stroke.map(n).join(" ")} RG\n${n(paint.width)} w\n`] : []),
    `${["butt", "round", "square"].indexOf(paint.lineCap)} J\n${["miter", "round", "bevel"].indexOf(paint.lineJoin)} j\n${n(paint.miterLimit)} M\n`,
    `[${paint.dash.map(n).join(" ")}] ${n(paint.dashOffset)} d\n`,
    ...drawing.commands.map(path),
    `${operation(paint)}\nQ\n`,
  ];
}
