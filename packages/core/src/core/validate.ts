import { exceeds } from "../measurement/arithmetic.js";
import { ledger, type WorkLedger } from "../measurement/ledger.js";
import { identity, matrix, multiply } from "../painting/affine.js";
import { type Bounds, intersection, pathBounds, rectangle } from "../painting/bounds.js";
import { clip, drawing } from "../painting/read.js";
import type { Matrix } from "../painting/types.js";
import type { DocumentDefinition } from "../types.js";
import { dataRecord } from "./data.js";
import { fail } from "./error.js";
import { checkLimit } from "./policy.js";
import { array, finite, number, validateDataObject as record } from "./schema.js";
import { emptyTextResources, type ResolvedTextResources as ResolvedFonts, textService } from "./text-resources.js";

interface View {
  width: number;
  height: number;
  matrix: Matrix;
  clip?: Bounds;
  local: boolean;
}
interface Counts {
  nodes: number;
  commands: number;
  fonts: ResolvedFonts;
  active: Set<object>;
  budget: WorkLedger;
  readonly tasks: (() => void)[];
}

function inPage(bounds: Bounds | undefined, view: View, path: string, richBox = false): void {
  if (!bounds) return;
  const visible = view.clip ? intersection(bounds, view.clip) : bounds;
  if (
    visible &&
    (visible[0] < 0 ||
      visible[1] < 0 ||
      (richBox ? exceeds(visible[2], view.width) : visible[2] > view.width) ||
      (richBox ? exceeds(visible[3], view.height) : visible[3] > view.height))
  )
    fail("BOUNDS", path, "Visible geometry/stroke must fit page or bounded clip");
}
function box(node: Record<string, unknown>, view: View, path: string): void {
  const x = view.local ? finite(node.x, `${path}/x`) : number(node.x, `${path}/x`);
  const y = view.local ? finite(node.y, `${path}/y`) : number(node.y, `${path}/y`);
  const width = number(node.width, `${path}/width`, true),
    height = number(node.height, `${path}/height`, node.type !== "richText");
  inPage(rectangle(x, y, width, height, view.matrix), view, path, node.type === "richText");
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
  array(node.children, state.budget.policy.nodes, `${path}/children`);
  const next: View = {
    width: view.width,
    height: view.height,
    matrix: transform,
    local: true,
    ...(region ? { clip: region } : {}),
  };
  for (let i = node.children.length - 1; i >= 0; i--) {
    const item = node.children[i];
    state.tasks.push(() => child(item, next, `${path}/children/${i}`, state, depth + 1));
  }
}
function contents(node: Record<string, unknown>, view: View, path: string, state: Counts, depth: number): void {
  if (node.type === "richText") {
    box(node, view, path);
    textService(state.fonts, path).validate(
      { width: node.width, height: node.height, paragraphs: node.paragraphs },
      { bindings: state.fonts.bindings, budget: state.budget },
      path,
    );
    return;
  }
  if (node.type === "paintGroup") {
    group(node, view, path, state, depth);
    return;
  }
  if (node.type === "path" || node.type === "rect" || node.type === "line") {
    const count = node.type === "path" ? pathLength(node.commands, path, state) : node.type === "rect" ? 5 : 2;
    state.commands = checkLimit(state.commands + count, state.budget.policy.pathCommands, path, "Path commands");
  }
  if (node.type === "path" || "paint" in node || "transform" in node || view.local) {
    const geometry = drawing(node, path);
    inPage(pathBounds(geometry.commands, multiply(view.matrix, geometry.matrix), geometry.paint), view, path);
  } else if (node.type === "rect") box(node, view, path);
  else line(node, view, path);
}
function pathLength(value: unknown, path: string, state: Counts): number {
  array(value, state.budget.policy.pathCommands - state.commands, `${path}/commands`);
  return value.length;
}
function nodeRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  dataRecord(value, path);
  const allowed =
    value.type === "richText"
      ? ["type", "x", "y", "width", "height", "paragraphs"]
      : value.type === "rect"
        ? ["type", "x", "y", "width", "height", "paint", "transform"]
        : value.type === "line"
          ? ["type", "x", "y", "x2", "y2", "paint", "transform"]
          : value.type === "path"
            ? ["type", "commands", "paint", "transform"]
            : ["type", "children", "clip", "transform"];
  if (
    value.type !== "richText" &&
    value.type !== "rect" &&
    value.type !== "line" &&
    value.type !== "path" &&
    value.type !== "paintGroup"
  )
    fail("TYPE", `${path}/type`, "Unsupported node type");
  record(value, allowed, path);
}
function child(value: unknown, view: View, path: string, state: Counts, depth: number): void {
  checkLimit(depth, state.budget.policy.depth, path, "Depth");
  state.nodes = checkLimit(state.nodes + 1, state.budget.policy.nodes, path, "Nodes");
  nodeRecord(value, path);
  if (state.active.has(value)) fail("TYPE", path, "Cyclic painting containers");
  state.active.add(value);
  state.tasks.push(() => {
    state.active.delete(value);
  });
  contents(value, view, path, state, depth);
}
export function validate(
  document: unknown,
  fonts: ResolvedFonts = emptyTextResources,
  budget: WorkLedger = ledger(),
): asserts document is DocumentDefinition {
  record(document, ["version", "pages"], "");
  if (document.version !== 1) fail("VERSION", "/version", "Only version 1 is supported");
  array(document.pages, budget.policy.pages, "/pages");
  if (!document.pages.length) fail("VALUE", "/pages", "At least one page is required");
  const state: Counts = { nodes: 0, commands: 0, fonts, active: new Set(), budget, tasks: [] };
  document.pages.forEach((page, i) => {
    const path = `/pages/${i}`;
    record(page, ["width", "height", "children"], path);
    const view: View = {
      width: number(page.width, `${path}/width`, true),
      height: number(page.height, `${path}/height`, true),
      matrix: identity,
      local: false,
    };
    array(page.children, budget.policy.nodes, `${path}/children`);
    page.children.forEach((item, j) => {
      child(item, view, `${path}/children/${j}`, state, 0);
      while (state.tasks.length) state.tasks.pop()?.();
    });
  });
}
