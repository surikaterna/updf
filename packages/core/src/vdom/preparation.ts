import { fail } from "../core/error.js";
import { captureChildren, type NormalizedContent, replaceCapturedRecipe } from "./normalize.js";
import type { State } from "./state.js";
import type { SemanticRecipe } from "./recipes.js";
import { snapshot } from "./data.js";
import { checkLimit, codePoints } from "../core/policy.js";
import { characters, work } from "../measurement/ledger.js";
type RecipePreparer = (
  recipe: SemanticRecipe,
  path: string,
  snapshot: (recipe: SemanticRecipe) => SemanticRecipe,
) => SemanticRecipe;

/** Synchronous lifetime controls; the optional driver owns all asynchronous work. */
export function preparationControls(state: State) {
  state.preparation = "capturing";
  state.captureRecipe = (recipe, path, depth) => captureRecipe(recipe, path, depth, state);
  const captured: NormalizedContent[] = [];
  const lists: (readonly NormalizedContent[])[] = [];
  const requirePhase = (phase: State["preparation"]): void => {
    if (state.closed || state.preparation !== phase) fail("MEASUREMENT_CONTEXT", "", "Invalid preparation transition");
  };
  return Object.freeze({
    recipes(prepare: RecipePreparer) {
      requirePhase("capturing");
      installRecipes(state, prepare);
    },
    replace(node: NormalizedContent, recipe: SemanticRecipe) {
      requirePhase("suspended");
      replaceCapturedRecipe(node, state, recipe);
    },
    capture(node: NormalizedContent, children: readonly NormalizedContent[]) {
      requirePhase("capturing");
      captureChildren(node, state, children);
      for (const child of children) captured.push(child);
      lists.push(children);
    },
    suspend() {
      requirePhase("capturing");
      state.preparation = "suspended";
    },
    seal(roots: readonly NormalizedContent[]) {
      requirePhase("suspended");
      freezeNodes([...roots, ...captured]);
      for (const list of lists) Object.freeze(list);
      state.preparation = "sealed";
    },
    layout<T>(invoke: () => T): T {
      requirePhase("sealed");
      state.preparation = "sealed-layout";
      try {
        return invoke();
      } finally {
        state.closed = true;
      }
    },
    close() {
      if (state.closed) return;
      state.closed = true;
    },
  });
}

function installRecipes(state: State, prepare: RecipePreparer): void {
  state.prepareRecipe = (recipe, path, depth) =>
    prepare(recipe, path, (value) => {
      if (state.closed || state.preparation !== "capturing")
        fail("MEASUREMENT_CONTEXT", path, "Expected capturing operation");
      return captureRecipe(value, path, depth, state);
    });
}

function freezeNodes(nodes: NormalizedContent[]): void {
  const seen = new Set<object>();
  while (nodes.length) {
    const node = nodes.pop();
    if (!node || seen.has(node)) continue;
    seen.add(node);
    for (const child of node.children) nodes.push(child);
    Object.freeze(node.children);
    if (typeof node.value !== "string") {
      Object.freeze(node.value);
    }
    Object.freeze(node);
  }
}

function captureRecipe(recipe: SemanticRecipe, path: string, depth: number, state: State): SemanticRecipe {
  // Data resolvers may return caller aliases. Own their graph before any suspension,
  // retaining only existing trusted opaque identities, never freezing the input.
  const props = snapshot(recipe.props, path, true, (value, at) => {
    checkLimit(depth + at.slice(path.length).split("/").length - 1, state.budget.policy.depth, at, "Content depth");
    work(state.budget, 1, at);
    state.sourceNodes = checkLimit(state.sourceNodes + 1, state.budget.policy.nodes, at, "Content source nodes");
    if (typeof value === "string") characters(state.budget, codePoints(value), at);
  });
  return Object.freeze({ ...recipe, props });
}
