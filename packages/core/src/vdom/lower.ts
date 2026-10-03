import { scheduleArray } from "../core/data.js";
import { DocumentError, fail } from "../core/error.js";
import { operation } from "../core/operation.js";
import { checkLimit } from "../core/policy.js";
import { validate } from "../core/validate.js";
import { ledger, work } from "../measurement/ledger.js";
import type { DocumentDefinition, NodeDefinition } from "../types.js";
import { enterProvider } from "./context.js";
import { dataRecord, snapshot } from "./data.js";
import { expand } from "./expand.js";
import { measureOutput } from "./measure-output.js";
import { native } from "./native.js";
import { operationState } from "./operation-state.js";
import { isVNode } from "./ownership.js";
import { beginExpansion } from "./progress.js";
import { semanticRecipe } from "./recipes.js";
import type { Location, State, Walk } from "./state.js";
import type { LowerOptions, VDOMChild } from "./types.js";

function walker(state: State): Walk {
  return (child, location, path, depth) => {
    const tasks: (() => void)[] = [];
    tasks.push(() => step(child, location, path, depth, state, tasks));
    while (tasks.length) tasks.pop()?.();
  };
}
export function lowerDrawing(
  input: unknown,
  state: State,
  width: number,
  height: number,
  path: string,
): readonly NodeDefinition[] {
  const page = { width, height, children: [] as Record<string, unknown>[] };
  const counts = [state.generatedNodes, state.generatedText, state.generatedCommands] as const;
  const environment = state.environment,
    expansions = state.expansions.length,
    active = new Set(state.active);
  try {
    walker(state)(input, { mode: "draw", x: 0, y: 0, page, astPath: path }, path, 0);
    return snapshot(page.children, path) as unknown as readonly NodeDefinition[];
  } finally {
    [state.generatedNodes, state.generatedText, state.generatedCommands] = counts;
    state.environment = environment;
    state.expansions.length = expansions;
    state.active.clear();
    for (const node of active) state.active.add(node);
  }
}
function step(
  child: unknown,
  location: Location,
  path: string,
  depth: number,
  state: State,
  tasks: (() => void)[],
): void {
  checkLimit(depth, state.budget.policy.depth, path, "VDOM depth");
  work(state.budget, 1, path);
  if (child == null || typeof child === "boolean") return;
  if (typeof child !== "object") fail("TYPE", path, "Only text nodes can contain strings; numbers are never coerced");
  if (state.active.has(child)) fail("VDOM_CYCLE", path, "Cyclic VDOM expansion");
  state.sourceNodes = checkLimit(state.sourceNodes + 1, state.budget.policy.nodes, path, "VDOM source nodes");
  state.active.add(child);
  const previous = state.environment;
  const expansionCount = state.expansions.length;
  beginExpansion(child, state.expansions, previous, path);
  tasks.push(() => {
    state.active.delete(child);
    state.environment = previous;
    state.expansions.length = expansionCount;
  });
  const walk: Walk = (next, at, pointer, level) => {
    tasks.push(() => step(next, at, pointer, level, state, tasks));
  };
  visit(child, location, path, depth, state, walk, tasks);
}

function visit(
  child: object,
  location: Location,
  path: string,
  depth: number,
  state: State,
  walk: Walk,
  tasks: (() => void)[],
): void {
  if (Array.isArray(child)) {
    scheduleArray(child, path, tasks, (item, i) => step(item, location, `${path}/${i}`, depth + 1, state, tasks));
    return;
  }
  if (!isVNode(child)) fail("TYPE", path, "Expected a library-created VDOM node");
  if (location.mode === "draw" && semanticRecipe(child))
    fail("VDOM_HIERARCHY", path, "Semantic content cannot be nested in a fixed Page drawing tree");
  if (child.kind === "provider") {
    const { children } = enterProvider(child, state);
    walk(children, location, `${path}/provider`, depth + 1);
    return;
  }
  if (child.kind === "native") native(child, location, path, depth, state, walk);
  else walk(expand(child, state, path), location, `${path}/expanded`, depth + 1);
}

function finish(state: State): DocumentDefinition {
  if (!state.document) fail("VDOM_HIERARCHY", "/tree", "Expected exactly one document");
  const result = { ...state.document, pages: state.pages };
  try {
    const generated = ledger(state.budget.policy, false);
    validate(result, state.fonts, generated);
    measureOutput(result, state.fonts, generated);
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
  const { fonts, budget } = operation(options, ["registry", "resourceMetadata"]);
  const state = operationState(fonts, budget, options);
  state.drawing = (input, width, height, path) => lowerDrawing(input, state, width, height, path);
  try {
    walker(state)(tree, { mode: "root", x: 0, y: 0 }, "/tree", 0);
    return finish(state);
  } finally {
    state.closed = true;
  }
}
