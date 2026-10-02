import { DocumentError, fail } from "../core/error.js";
import { validate } from "../core/validate.js";
import { resolveResources } from "../fonts/resources.js";
import type { DocumentDefinition } from "../types.js";
import { dataArray, dataRecord, keys, snapshot } from "./data.js";
import { expand } from "./expand.js";
import { native } from "./native.js";
import { isVNode } from "./ownership.js";
import { context, install } from "./registry.js";
import type { Location, State, Walk } from "./state.js";
import type { LowerOptions, VDOMChild } from "./types.js";

function walker(state: State): Walk {
  const walk = (child: unknown, location: Location, path: string, depth: number): void => {
    if (depth > 128 || ++state.units > 10000) fail("LIMIT", path, "VDOM depth/expansion budget exceeded");
    if (child == null || typeof child === "boolean") return;
    if (typeof child !== "object") fail("TYPE", path, "Only text nodes can contain strings; numbers are never coerced");
    if (state.active.has(child)) fail("VDOM_CYCLE", path, "Cyclic VDOM expansion");
    state.active.add(child);
    try {
      visit(child, location, path, depth, state, walk);
    } finally {
      state.active.delete(child);
    }
  };
  return walk;
}

function visit(child: object, location: Location, path: string, depth: number, state: State, walk: Walk): void {
  if (Array.isArray(child)) {
    dataArray(child, path);
    for (let i = 0; i < child.length; i++) walk(child[i], location, `${path}/${i}`, depth + 1);
    return;
  }
  if (!isVNode(child)) fail("TYPE", path, "Expected a library-created VDOM node");
  if (child.kind === "native") native(child, location, path, depth, state, walk);
  else walk(expand(child, state, path), location, `${path}/expanded`, depth + 1);
}

function finish(state: State): DocumentDefinition {
  if (!state.document) fail("VDOM_HIERARCHY", "/tree", "Expected exactly one document");
  const result = { ...state.document, pages: state.pages };
  try {
    validate(result, state.fonts);
  } catch (error: unknown) {
    if (!(error instanceof DocumentError)) throw error;
    const diagnostic = error.diagnostics[0];
    if (!diagnostic) throw error;
    const prefix =
      [...state.origins.keys()]
        .sort((a, b) => b.length - a.length)
        .find((key) => diagnostic.path === key || diagnostic.path.startsWith(`${key}/`)) ?? "";
    throw new DocumentError(
      diagnostic.code,
      `${state.origins.get(prefix) ?? "/tree"}${diagnostic.path.slice(prefix.length)}`,
      diagnostic.message,
      diagnostic,
    );
  }
  return snapshot(result, "/result");
}

/** Synchronous trusted component execution, fresh local registry/budgets/outputs each call. */
export function lower(tree: VDOMChild, options: LowerOptions = {}): DocumentDefinition {
  dataRecord(options, "/options");
  keys(options, ["registry", "resourceMetadata", "resources"], "/options");
  if (
    ("registry" in options && options.registry == null) ||
    ("resourceMetadata" in options && options.resourceMetadata == null)
  ) {
    fail("TYPE", "/options", "Present options must have explicit data values");
  }
  const fonts = resolveResources("resources" in options ? { resources: options.resources } : {});
  const metadata = context(options.resourceMetadata ?? []).resources;
  if (metadata.some((item) => fonts.has(item.id)))
    fail("FONT_RESOURCE", "/options/resourceMetadata", "Metadata cannot override font resource ids");
  const resources = [...fonts.keys()].map((id) => ({ id, kind: "font" }));
  const state: State = {
    units: 0,
    active: new Set(),
    installed: install(options.registry ?? []),
    fonts,
    context: context([...resources, ...metadata]),
    pages: [],
    origins: new Map(),
  };
  walker(state)(tree, { mode: "root", x: 0, y: 0 }, "/tree", 0);
  return finish(state);
}
