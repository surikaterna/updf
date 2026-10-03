import { fail } from "../core/error.js";
import { finite, number, validateDataObject as record } from "../core/schema.js";
import { matrix } from "./affine.js";
import { commands } from "./commands.js";
import { paint } from "./style.js";
import type { ClipRect, PathCommand, ResolvedDrawing } from "./types.js";

export function clip(value: unknown, path: string): ClipRect | undefined {
  if (value === undefined) return undefined;
  record(value, ["x", "y", "width", "height"], path);
  return Object.freeze({
    x: finite(value.x, `${path}/x`),
    y: finite(value.y, `${path}/y`),
    width: number(value.width, `${path}/width`, true),
    height: number(value.height, `${path}/height`, true),
  });
}
function primitive(node: Record<string, unknown>, path: string): readonly PathCommand[] {
  if (node.type === "path") return commands(node.commands, `${path}/commands`);
  const x = finite(node.x, `${path}/x`),
    y = finite(node.y, `${path}/y`);
  if (node.type === "line") {
    const x2 = finite(node.x2, `${path}/x2`),
      y2 = finite(node.y2, `${path}/y2`);
    if (x === x2 && y === y2) fail("GEOMETRY", path, "Line must have positive length");
    return [
      { type: "move", x, y },
      { type: "line", x: x2, y: y2 },
    ];
  }
  const width = number(node.width, `${path}/width`, true),
    height = number(node.height, `${path}/height`, true);
  return [
    { type: "move", x, y },
    { type: "line", x: finite(x + width, path), y },
    { type: "line", x: x + width, y: finite(y + height, path) },
    { type: "line", x, y: y + height },
    { type: "close" },
  ];
}
export function drawing(node: Record<string, unknown>, path: string): ResolvedDrawing {
  if (node.type !== "path" && node.type !== "rect" && node.type !== "line")
    fail("TYPE", path, "Expected painting node");
  for (const key of ["paint", "transform"])
    if (key in node && node[key] === undefined)
      fail("TYPE", `${path}/${key}`, "Omit optional fields instead of undefined");
  return Object.freeze({
    commands: primitive(node, path),
    paint: paint(node.paint, node.type, `${path}/paint`),
    matrix: matrix(node.transform, `${path}/transform`),
  });
}
