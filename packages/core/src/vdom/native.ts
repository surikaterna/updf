import { fail } from "../core/error.js";
import { checkLimit } from "../core/policy.js";
import type { NodeKind } from "../nodes/context.js";
import { isNativeNodeKind } from "../nodes/metadata.js";
import { coordinate } from "../nodes/native-fields.js";
import { acceptedKeys, lowering, nativeWork } from "../nodes/wiring.js";
import { keys } from "./data.js";
import type { Location, State, Walk } from "./state.js";
import { Fragment, type NativeVNode } from "./types.js";

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
  if (!isNativeNodeKind(node.tag)) fail("TYPE", path, "Unsupported native drawing type");
  keys(node.props, acceptedKeys(node.tag).slice(1), `${path}/props`);
  const output = lowering(node.tag)(node.props, location.x, location.y, path);
  const target = location.target ?? location.page.children;
  const base = location.astPath ?? `/pages/${state.pages.indexOf(location.page)}`;
  state.origins.set(`${base}/children/${target.length}`, `${path}/props`);
  reserveNode(state, path);
  reserveContent(output, node.tag, state, path);
  target.push(output);
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
  keys(node.props, acceptedKeys("paintGroup").slice(1), `${path}/props`);
  const output = lowering("paintGroup")(node.props, location.x, location.y, path);
  const children: Record<string, unknown>[] = [];
  const target = location.target ?? location.page.children;
  const base = location.astPath ?? `/pages/${state.pages.indexOf(location.page)}`;
  const astPath = `${base}/children/${target.length}`;
  state.origins.set(astPath, `${path}/props`);
  reserveNode(state, path);
  target.push({ ...output, children });
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
function reserveContent(props: Record<string, unknown>, tag: NodeKind, state: State, path: string): void {
  const work = nativeWork(tag)?.(props);
  state.generatedText = checkLimit(
    state.generatedText + (work?.points ?? 0),
    state.budget.policy.textCodePoints,
    path,
    "Generated text code points",
  );
  state.generatedCommands = checkLimit(
    state.generatedCommands + (work?.commands ?? 0),
    state.budget.policy.pathCommands,
    path,
    "Generated path commands",
  );
}
