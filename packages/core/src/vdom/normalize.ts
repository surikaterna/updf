import { scheduleArray } from "../core/data.js";
import { fail } from "../core/error.js";
import { checkLimit } from "../core/policy.js";
import { work } from "../measurement/ledger.js";
import { enterProvider, type ProviderEnvironment, scopedEnvironment } from "./context.js";
import { expand } from "./expand.js";
import { isVNode } from "./ownership.js";
import { beginExpansion } from "./progress.js";
import { type SemanticRecipe, semanticRecipe } from "./recipes.js";
import type { State } from "./state.js";
import { Fragment, type Key } from "./types.js";

export interface NormalizedContent {
  readonly key?: Key;
  readonly value: string | SemanticRecipe;
  readonly path: string;
  readonly children: readonly NormalizedContent[];
  readonly scope?: object;
}
const scopes = new WeakMap<object, { state: State; environment: ProviderEnvironment }>();
export function withContentScope<T>(scope: object, state: State, invoke: () => T): T {
  const captured = scopes.get(scope);
  if (!captured || captured.state !== state || state.closed) fail("MEASUREMENT_CONTEXT", "", "Invalid content scope");
  const previous = state.environment;
  state.environment = scopedEnvironment(captured.environment, previous);
  try {
    return invoke();
  } finally {
    state.environment = previous;
  }
}
export type DataRecipe = (value: object, path: string) => SemanticRecipe;
export type ContentGuard = (value: string | SemanticRecipe, path: string, parent: object | undefined) => void;
interface WalkState {
  readonly numeric?: boolean;
  readonly state: State;
  readonly data: DataRecipe;
  readonly tasks: (() => void)[];
  readonly guard?: ContentGuard;
  readonly native?: DataRecipe;
}
export function normalizeContent(
  input: unknown,
  state: State,
  data: DataRecipe,
  path: string,
  guard?: ContentGuard,
  native?: DataRecipe,
  numeric?: boolean,
): NormalizedContent[] {
  const result: NormalizedContent[] = [];
  const walk: WalkState = {
    state,
    data,
    tasks: [],
    ...(guard ? { guard } : {}),
    ...(native ? { native } : {}),
    ...(numeric ? { numeric } : {}),
  };
  visit(input, path, 0, result, walk);
  while (walk.tasks.length) walk.tasks.pop()?.();
  return result;
}
export function normalizeScoped(
  input: unknown,
  state: State,
  data: DataRecipe,
  path: string,
  guard?: ContentGuard,
  native?: DataRecipe,
  numeric?: boolean,
): NormalizedContent[] {
  const environment = state.environment,
    count = state.expansions.length,
    active = new Set(state.active);
  try {
    return normalizeContent(input, state, data, path, guard, native, numeric);
  } finally {
    state.environment = environment;
    state.expansions.length = count;
    state.active.clear();
    for (const node of active) state.active.add(node);
  }
}
function visit(
  input: unknown,
  path: string,
  depth: number,
  target: NormalizedContent[],
  walk: WalkState,
  parent?: object,
): void {
  const { state, tasks } = walk;
  checkLimit(depth, state.budget.policy.depth, path, "Content depth");
  work(state.budget, 1, path);
  if (typeof input === "number" && walk.numeric && parent === undefined) {
    if (!Number.isFinite(input)) fail("TYPE", path, "Numeric cell text must be finite");
    input = String(input);
  }
  if (input == null || typeof input === "boolean") return;
  if (typeof input === "string") {
    walk.guard?.(input, path, parent);
    target.push({ value: input, path, children: [] });
    return;
  }
  if (typeof input !== "object") fail("TYPE", path, "Content accepts strings; numbers are never coerced");
  if (state.active.has(input)) fail("VDOM_CYCLE", path, "Cyclic content expansion");
  state.sourceNodes = checkLimit(state.sourceNodes + 1, state.budget.policy.nodes, path, "Content source nodes");
  const previous = state.environment;
  const count = state.expansions.length;
  beginExpansion(input, state.expansions, previous, path);
  state.active.add(input);
  tasks.push(() => {
    state.active.delete(input);
    state.environment = previous;
    state.expansions.length = count;
  });
  descend(input, path, depth, target, walk, parent);
}
function descend(
  input: object,
  path: string,
  depth: number,
  target: NormalizedContent[],
  walk: WalkState,
  parent?: object,
): void {
  const next = (value: unknown, at: string, into = target, role = parent): void => {
    walk.tasks.push(() => visit(value, at, depth + 1, into, walk, role));
  };
  if (Array.isArray(input)) {
    scheduleArray(input, path, walk.tasks, (value, index) =>
      visit(value, `${path}/${index}`, depth + 1, target, walk, parent),
    );
    return;
  }
  if (isVNode(input)) {
    if (input.kind === "provider") {
      next(enterProvider(input, walk.state).children, `${path}/provider`);
      return;
    }
    const recipe = semanticRecipe(input);
    if (recipe) {
      walk.guard?.(recipe, path, parent);
      appendRecipe(recipe, path, target, next, walk.state, input.key);
      return;
    }
    if (input.kind === "native") {
      if (input.tag !== Fragment) {
        appendDrawing(input, path, parent, target, next, walk);
        return;
      }
      next(input.props.children, `${path}/children`);
      return;
    }
    next(expand(input, walk.state, path), `${path}/expanded`);
    return;
  }
  const recipe = walk.data(input, path);
  walk.guard?.(recipe, path, parent);
  appendRecipe(recipe, path, target, next, walk.state);
}
function appendDrawing(
  input: object,
  path: string,
  parent: object | undefined,
  target: NormalizedContent[],
  next: (value: unknown, path: string, into: NormalizedContent[], parent?: object) => void,
  walk: WalkState,
): void {
  if (!walk.native) fail("VDOM_HIERARCHY", path, "Expected semantic content, not a native drawing");
  const recipe = walk.native(input, path);
  walk.guard?.(recipe, path, parent);
  appendRecipe(recipe, path, target, next, walk.state);
}
function appendRecipe(
  recipe: SemanticRecipe,
  path: string,
  target: NormalizedContent[],
  next: (value: unknown, path: string, into: NormalizedContent[], parent?: object) => void,
  state: State,
  key?: Key,
): void {
  const children: NormalizedContent[] = [];
  const scope = Object.freeze({});
  scopes.set(scope, { state, environment: state.environment });
  target.push({ value: recipe, path, children, scope, ...(key === undefined ? {} : { key }) });
  if (!recipe.opaque && "children" in recipe.props)
    next(recipe.props.children, `${path}/children`, children, recipe.identity);
}
