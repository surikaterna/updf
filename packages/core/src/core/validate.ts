import { validateCharacters } from "../fonts/profile.js";
import { type ResolvedFonts, selectedFont } from "../fonts/resources.js";
import { identity, matrix, multiply } from "../painting/affine.js";
import { type Bounds, intersection, pathBounds, rectangle } from "../painting/bounds.js";
import { clip, drawing } from "../painting/read.js";
import type { Matrix } from "../painting/types.js";
import type { DocumentDefinition } from "../types.js";
import { fail, limits } from "./error.js";
import { array, finite, number, record } from "./schema.js";

interface View {
  width: number;
  height: number;
  matrix: Matrix;
  clip?: Bounds;
  local: boolean;
}
interface Counts {
  nodes: number;
  chars: number;
  commands: number;
  fonts: ResolvedFonts;
  active: Set<object>;
}

function inPage(bounds: Bounds | undefined, view: View, path: string): void {
  if (!bounds) return;
  const visible = view.clip ? intersection(bounds, view.clip) : bounds;
  if (visible && (visible[0] < 0 || visible[1] < 0 || visible[2] > view.width || visible[3] > view.height))
    fail("BOUNDS", path, "Visible geometry/stroke must fit page or bounded clip");
}
function box(node: Record<string, unknown>, view: View, path: string): void {
  const x = view.local ? finite(node.x, `${path}/x`) : number(node.x, `${path}/x`);
  const y = view.local ? finite(node.y, `${path}/y`) : number(node.y, `${path}/y`);
  const width = number(node.width, `${path}/width`, true),
    height = number(node.height, `${path}/height`, true);
  inPage(rectangle(x, y, width, height, view.matrix), view, path);
}
function text(node: Record<string, unknown>, path: string, state: Counts): void {
  if (typeof node.text !== "string") fail("TYPE", `${path}/text`, "Expected text");
  if (node.text.length > limits.text) fail("LIMIT", `${path}/text`, "Text node too long");
  state.chars += node.text.length;
  if (state.chars > limits.totalText) fail("LIMIT", `${path}/text`, "Total text limit exceeded");
  if ("font" in node && typeof node.font !== "string")
    fail("FONT_RESOURCE", `${path}/font`, "Font reference must be a string");
  validateCharacters(node.text, selectedFont(node.font, state.fonts, `${path}/font`), `${path}/text`);
  const fontSize = number(node.fontSize, `${path}/fontSize`, true),
    lineHeight = number(node.lineHeight, `${path}/lineHeight`, true);
  if (lineHeight < fontSize) fail("GEOMETRY", `${path}/lineHeight`, "Line height must be at least font size");
  if (node.align !== "left" && node.align !== "center" && node.align !== "right")
    fail("VALUE", `${path}/align`, "Unsupported alignment");
}
function line(node: Record<string, unknown>, view: View, path: string): void {
  const x = view.local ? finite(node.x, `${path}/x`) : number(node.x, `${path}/x`);
  const y = view.local ? finite(node.y, `${path}/y`) : number(node.y, `${path}/y`);
  const x2 = view.local ? finite(node.x2, `${path}/x2`) : number(node.x2, `${path}/x2`);
  const y2 = view.local ? finite(node.y2, `${path}/y2`) : number(node.y2, `${path}/y2`);
  if (x === x2 && y === y2) fail("GEOMETRY", path, "Line must have positive length");
  const geometry = drawing(node, path);
  // Legacy line behavior validates endpoints only, not conservative stroke padding.
  const paint = { ...geometry.paint, stroke: null, fill: [0, 0, 0] as const };
  inPage(pathBounds(geometry.commands, view.matrix, paint), view, path);
}
function group(node: Record<string, unknown>, view: View, path: string, state: Counts, depth: number): void {
  const transform = multiply(view.matrix, matrix(node.transform, `${path}/transform`));
  if (("clip" in node && node.clip === undefined) || ("transform" in node && node.transform === undefined))
    fail("TYPE", path, "Omit optional fields instead of undefined");
  const clipping = clip(node.clip, `${path}/clip`);
  let region = view.clip;
  if (clipping) {
    const bounded = rectangle(clipping.x, clipping.y, clipping.width, clipping.height, transform);
    // A nested viewport may extend beyond its parent, but cannot escape an
    // already page-bounded ancestor clip. Unbounded root clips still reject.
    inPage(bounded, view, `${path}/clip`);
    region = region ? intersection(region, bounded) : bounded;
    // Preserve an empty clip region rather than treating it as no clip.
    if (!region) region = [0, 0, 0, 0];
  }
  array(node.children, limits.nodes, `${path}/children`);
  const next: View = {
    width: view.width,
    height: view.height,
    matrix: transform,
    local: true,
    ...(region ? { clip: region } : {}),
  };
  node.children.forEach((item, i) => {
    child(item, next, `${path}/children/${i}`, state, depth + 1);
  });
}
function contents(node: Record<string, unknown>, view: View, path: string, state: Counts, depth: number): void {
  if (node.type === "paintGroup") {
    group(node, view, path, state, depth);
    return;
  }
  if (node.type === "text") {
    box(node, view, path);
    text(node, path, state);
    return;
  }
  if (node.type === "path" || "paint" in node || "transform" in node || view.local) {
    const geometry = drawing(node, path);
    state.commands += geometry.commands.length;
    if (state.commands > 100000) fail("LIMIT", path, "Total path command budget exceeded");
    inPage(pathBounds(geometry.commands, multiply(view.matrix, geometry.matrix), geometry.paint), view, path);
  } else if (node.type === "rect") box(node, view, path);
  else line(node, view, path);
}
function nodeRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  record(
    value,
    [
      "type",
      "x",
      "y",
      "width",
      "height",
      "text",
      "fontSize",
      "lineHeight",
      "align",
      "font",
      "x2",
      "y2",
      "commands",
      "paint",
      "transform",
      "clip",
      "children",
    ],
    path,
  );
  const allowed =
    value.type === "text"
      ? ["type", "x", "y", "width", "height", "text", "fontSize", "lineHeight", "align", "font"]
      : value.type === "rect"
        ? ["type", "x", "y", "width", "height", "paint", "transform"]
        : value.type === "line"
          ? ["type", "x", "y", "x2", "y2", "paint", "transform"]
          : value.type === "path"
            ? ["type", "commands", "paint", "transform"]
            : ["type", "children", "clip", "transform"];
  if (
    value.type !== "text" &&
    value.type !== "rect" &&
    value.type !== "line" &&
    value.type !== "path" &&
    value.type !== "paintGroup"
  )
    fail("TYPE", `${path}/type`, "Unsupported node type");
  record(value, allowed, path);
}
function child(value: unknown, view: View, path: string, state: Counts, depth: number): void {
  if (depth > 128 || ++state.nodes > limits.nodes) fail("LIMIT", path, "Node/depth limit exceeded");
  nodeRecord(value, path);
  if (state.active.has(value)) fail("TYPE", path, "Cyclic painting containers");
  state.active.add(value);
  try {
    contents(value, view, path, state, depth);
  } finally {
    state.active.delete(value);
  }
}
export function validate(document: unknown, fonts: ResolvedFonts = new Map()): asserts document is DocumentDefinition {
  record(document, ["version", "pages"], "");
  if (document.version !== 1) fail("VERSION", "/version", "Only version 1 is supported");
  array(document.pages, limits.pages, "/pages");
  if (!document.pages.length) fail("VALUE", "/pages", "At least one page is required");
  const state: Counts = { nodes: 0, chars: 0, commands: 0, fonts, active: new Set() };
  document.pages.forEach((page, i) => {
    const path = `/pages/${i}`;
    record(page, ["width", "height", "children"], path);
    const view: View = {
      width: number(page.width, `${path}/width`, true),
      height: number(page.height, `${path}/height`, true),
      matrix: identity,
      local: false,
    };
    array(page.children, limits.nodes, `${path}/children`);
    page.children.forEach((item, j) => {
      child(item, view, `${path}/children/${j}`, state, 0);
    });
  });
}
