import type { PathCommand } from "@updf/core/painting";
import { arc, ellipse, parsePathData, polygon } from "@updf/geometry";
import { mapped } from "./error.js";
import { attribute, numbers } from "./numbers.js";
import type { XMLElement } from "./types.js";

function rect(node: XMLElement): readonly PathCommand[] {
  const x = attribute(node, "x"),
    y = attribute(node, "y"),
    w = attribute(node, "width", 0, true),
    h = attribute(node, "height", 0, true);
  const rawRx = attribute(node, "rx", attribute(node, "ry", 0, true), true);
  const rawRy = attribute(node, "ry", rawRx, true);
  const rx = Math.min(w / 2, rawRx),
    ry = Math.min(h / 2, rawRy);
  if (!w || !h) return [];
  if (!rx || !ry) return polygon([x, y, x + w, y, x + w, y + h, x, y + h]);
  return [
    { type: "move", x: x + rx, y },
    { type: "line", x: x + w - rx, y },
    ...arc(x + w - rx, y, x + w, y + ry, rx, ry, 0, 0, 1),
    { type: "line", x: x + w, y: y + h - ry },
    ...arc(x + w, y + h - ry, x + w - rx, y + h, rx, ry, 0, 0, 1),
    { type: "line", x: x + rx, y: y + h },
    ...arc(x + rx, y + h, x, y + h - ry, rx, ry, 0, 0, 1),
    { type: "line", x, y: y + ry },
    ...arc(x, y + ry, x + rx, y, rx, ry, 0, 0, 1),
    { type: "close" },
  ];
}
export function geometry(node: XMLElement, name: string): readonly PathCommand[] {
  try {
    if (name === "rect") return rect(node);
    if (name === "circle" || name === "ellipse") {
      const rx = attribute(node, name === "circle" ? "r" : "rx", 0, true);
      return ellipse(
        attribute(node, "cx"),
        attribute(node, "cy"),
        rx,
        name === "circle" ? rx : attribute(node, "ry", 0, true),
      );
    }
    if (name === "line")
      return [
        { type: "move", x: attribute(node, "x1"), y: attribute(node, "y1") },
        { type: "line", x: attribute(node, "x2"), y: attribute(node, "y2") },
      ];
    if (name === "polygon" || name === "polyline") {
      const value = node.attrs.points;
      return polygon(numbers(value?.value ?? "", `${node.path}/@points`, value?.span ?? node.span), name === "polygon");
    }
    const d = node.attrs.d;
    return parsePathData(d?.value ?? "");
  } catch (error: unknown) {
    mapped(error, node.name.endsWith("path") ? `${node.path}/@d` : node.path, node.attrs.d?.span ?? node.span);
  }
}
