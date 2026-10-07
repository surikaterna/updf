import type { ResolvedPaint } from "@updf/core/internal";
import { paint } from "@updf/core/internal";
import { parseColor } from "@updf/geometry";
import { declarations, properties } from "./css.js";
import { validateDeclaration } from "./declaration.js";
import { mapped, svgFail } from "./error.js";
import { length, numbers } from "./numbers.js";
import type { ClassRule, Declaration, SVGDiagnostic, XMLElement } from "./types.js";

export type Style = Readonly<Record<string, string>>;
export const defaults: Style = Object.freeze({
  fill: "black",
  stroke: "none",
  "fill-opacity": "1",
  "stroke-opacity": "1",
  "fill-rule": "nonzero",
  "stroke-width": "1",
  "stroke-linecap": "butt",
  "stroke-linejoin": "miter",
  "stroke-miterlimit": "4",
  "stroke-dasharray": "none",
  "stroke-dashoffset": "0",
  visibility: "visible",
  display: "inline",
  opacity: "1",
});

function apply(target: Record<string, string>, entries: readonly Declaration[], parent: Style): void {
  for (const entry of entries)
    target[entry.name] = entry.value === "inherit" ? (parent[entry.name] ?? defaults[entry.name] ?? "") : entry.value;
}
export function cascade(
  node: XMLElement,
  parent: Style,
  rules: readonly ClassRule[],
  diagnostics: SVGDiagnostic[],
): Style {
  const result: Record<string, string> = { ...parent, display: "inline", opacity: "1" };
  const presentation: Declaration[] = [];
  for (const name of properties) {
    const attribute = node.attrs[name];
    if (attribute) {
      const entry = {
        name,
        value: attribute.value,
        ...(attribute.span ? { span: attribute.span } : {}),
        path: `${node.path}/@${name}`,
      };
      validateDeclaration(entry);
      presentation.push(entry);
    }
  }
  apply(result, presentation, parent);
  const classes = node.attrs.class?.value.trim().split(/\s+/).filter(Boolean) ?? [];
  if (classes.some((name) => !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)))
    svgFail("SVG_STYLE", `${node.path}/@class`, "Unsupported class token", node.attrs.class?.span ?? node.span);
  for (const rule of rules)
    if (rule.names.some((name) => classes.includes(name))) apply(result, rule.declarations, parent);
  const inline = node.attrs.style;
  if (inline)
    apply(result, declarations(inline.value, `${node.path}/@style`, inline.span, diagnostics, inline.offsets), parent);
  validate(result, node);
  return Object.freeze(result);
}
function validate(style: Style, node: XMLElement): void {
  if (Number(style.opacity) !== 1)
    svgFail(
      "SVG_UNSUPPORTED",
      `${node.path}/@opacity`,
      "Group/element opacity other than1 is unsupported",
      node.attrs.opacity?.span ?? node.span,
    );
  if (
    !["visible", "hidden", "collapse"].includes(style.visibility ?? "") ||
    !["inline", "none"].includes(style.display ?? "")
  )
    svgFail("SVG_UNSUPPORTED", node.path, "Unsupported visibility/display", node.span);
  resolved(style, node);
}
export function resolved(style: Style, node: XMLElement): ResolvedPaint {
  try {
    const fill = parseColor(style.fill ?? "black"),
      stroke = parseColor(style.stroke ?? "none");
    const unit = (key: string) => {
      const value = style[key] ?? "";
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))
        svgFail("SVG_STYLE", node.path, "Invalid opacity", node.span);
      return Number(value);
    };
    const scalar = (key: string) => length(style[key] ?? "", node.path, node.span);
    const dash =
      style["stroke-dasharray"] === "none" ? [] : numbers(style["stroke-dasharray"] ?? "", node.path, node.span);
    return paint(
      {
        fill: fill.rgb,
        stroke: stroke.rgb,
        fillOpacity: fill.opacity * unit("fill-opacity"),
        strokeOpacity: stroke.opacity * unit("stroke-opacity"),
        width: scalar("stroke-width"),
        miterLimit: scalar("stroke-miterlimit"),
        dash,
        dashOffset: scalar("stroke-dashoffset"),
        fillRule: style["fill-rule"],
        lineCap: style["stroke-linecap"],
        lineJoin: style["stroke-linejoin"],
      },
      "path",
      node.path,
    );
  } catch (error: unknown) {
    mapped(error, node.path, node.span);
  }
}
