import { fail } from "../core/error.js";
import { checkLimit, codePoints } from "../core/policy.js";
import { matrix, multiply } from "../painting/affine.js";
import { keys } from "./data.js";
import type { Location, State, Walk } from "./state.js";
import { Fragment, type NativeVNode } from "./types.js";

function coordinate(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail("GEOMETRY", path, "Expected a finite translation coordinate");
  return value;
}

function group(node: NativeVNode, location: Location, path: string, depth: number, walk: Walk): void {
  if (location.mode !== "draw") fail("VDOM_HIERARCHY", path, "Groups belong inside a page");
  keys(node.props, ["x", "y", "children"], `${path}/props`);
  const x = location.x + ("x" in node.props ? coordinate(node.props.x, `${path}/props/x`) : 0);
  const y = location.y + ("y" in node.props ? coordinate(node.props.y, `${path}/props/y`) : 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) fail("GEOMETRY", path, "Translation overflow");
  walk(node.props.children, { ...location, x, y }, `${path}/props/children`, depth + 1);
}

function drawing(node: NativeVNode, location: Location, path: string, state: State): void {
  if (location.mode !== "draw" || !location.page) fail("VDOM_HIERARCHY", path, "Drawing nodes belong inside a page");
  const boxKeys = ["x", "y", "width", "height"];
  const allowed =
    node.tag === "xObject"
      ? [...boxKeys, "resource"]
      : node.tag === "richText"
        ? [...boxKeys, "paragraphs"]
        : node.tag === "path"
          ? ["commands", "paint", "transform"]
          : node.tag === "line"
            ? ["x", "y", "x2", "y2", "paint", "transform"]
            : [...boxKeys, "paint", "transform"];
  keys(node.props, allowed, `${path}/props`);
  const props = { ...node.props };
  translateProps(props, node.tag === "path", location, path);
  const target = location.target ?? location.page.children;
  const base = location.astPath ?? `/pages/${state.pages.indexOf(location.page)}`;
  state.origins.set(`${base}/children/${target.length}`, `${path}/props`);
  reserveNode(state, path);
  reserveContent(props, node.tag, state, path);
  target.push({ type: node.tag, ...props });
}
function translateProps(props: Record<string, unknown>, pathNode: boolean, location: Location, path: string): void {
  if ("transform" in props && props.transform === undefined)
    fail("TYPE", `${path}/props/transform`, "Omit optional transform instead of undefined");
  if (pathNode || "transform" in props) {
    if (location.x || location.y || "transform" in props)
      props.transform = multiply([1, 0, 0, 1, location.x, location.y], matrix(props.transform, path));
    return;
  }
  props.x = coordinate(props.x, `${path}/props/x`) + location.x;
  props.y = coordinate(props.y, `${path}/props/y`) + location.y;
  if ("x2" in props) props.x2 = coordinate(props.x2, `${path}/props/x2`) + location.x;
  if ("y2" in props) props.y2 = coordinate(props.y2, `${path}/props/y2`) + location.y;
}
function paintingGroup(
  node: NativeVNode,
  location: Location,
  path: string,
  depth: number,
  state: State,
  walk: Walk,
): void {
  if (location.mode !== "draw" || !location.page)
    fail("VDOM_HIERARCHY", path, "Painting containers belong inside a page");
  keys(node.props, ["transform", "clip", "children"], `${path}/props`);
  const props = { ...node.props };
  delete props.children;
  translateProps(props, true, location, path);
  const children: Record<string, unknown>[] = [];
  const target = location.target ?? location.page.children;
  const base = location.astPath ?? `/pages/${state.pages.indexOf(location.page)}`;
  const astPath = `${base}/children/${target.length}`;
  state.origins.set(astPath, `${path}/props`);
  reserveNode(state, path);
  target.push({ type: "paintGroup", ...props, children });
  walk(
    node.props.children,
    { ...location, x: 0, y: 0, target: children, astPath },
    `${path}/props/children`,
    depth + 1,
  );
}

export function native(
  node: NativeVNode,
  location: Location,
  path: string,
  depth: number,
  state: State,
  walk: Walk,
): void {
  if (node.tag === Fragment) {
    keys(node.props, ["children"], `${path}/props`);
    walk(node.props.children, location, `${path}/props/children`, depth + 1);
  } else if (node.tag === "document") document(node, location, path, depth, state, walk);
  else if (node.tag === "page") page(node, location, path, depth, state, walk);
  else if (node.tag === "group") group(node, location, path, depth, walk);
  else if (node.tag === "paintGroup") paintingGroup(node, location, path, depth, state, walk);
  else drawing(node, location, path, state);
}

function document(node: NativeVNode, location: Location, path: string, depth: number, state: State, walk: Walk): void {
  if (location.mode !== "root" || state.document)
    fail("VDOM_HIERARCHY", path, "Exactly one top-level document is allowed");
  keys(node.props, ["version", "children"], `${path}/props`);
  state.document = { version: node.props.version };
  state.origins.set("", `${path}/props`);
  state.origins.set("/pages", `${path}/props/children`);
  walk(node.props.children, { mode: "pages", x: 0, y: 0 }, `${path}/props/children`, depth + 1);
}

function page(node: NativeVNode, location: Location, path: string, depth: number, state: State, walk: Walk): void {
  if (location.mode !== "pages") fail("VDOM_HIERARCHY", path, "Pages must be direct document children after expansion");
  keys(node.props, ["width", "height", "children"], `${path}/props`);
  checkLimit(state.pages.length + 1, state.budget.policy.pages, path, "Pages");
  const output = { width: node.props.width, height: node.props.height, children: [] };
  state.origins.set(`/pages/${state.pages.length}`, `${path}/props`);
  state.pages.push(output);
  walk(node.props.children, { mode: "draw", x: 0, y: 0, page: output }, `${path}/props/children`, depth + 1);
}
function reserveNode(state: State, path: string): void {
  state.generatedNodes = checkLimit(state.generatedNodes + 1, state.budget.policy.nodes, path, "Generated nodes");
}
function reserveContent(props: Record<string, unknown>, tag: NativeVNode["tag"], state: State, path: string): void {
  let points = 0;
  if (tag === "richText" && Array.isArray(props.paragraphs)) {
    for (const paragraph of props.paragraphs) points += paragraphPoints(paragraph);
  }
  state.generatedText = checkLimit(
    state.generatedText + points,
    state.budget.policy.textCodePoints,
    path,
    "Generated text code points",
  );
  const commands =
    tag === "path" && Array.isArray(props.commands)
      ? props.commands.length
      : tag === "rect"
        ? 5
        : tag === "line"
          ? 2
          : 0;
  state.generatedCommands = checkLimit(
    state.generatedCommands + commands,
    state.budget.policy.pathCommands,
    path,
    "Generated path commands",
  );
}
function paragraphPoints(paragraph: unknown): number {
  if (!paragraph || typeof paragraph !== "object" || !("runs" in paragraph) || !Array.isArray(paragraph.runs)) return 0;
  let points = 0;
  for (const run of paragraph.runs) if (run && typeof run.text === "string") points += codePoints(run.text);
  return points;
}
