/** Optional private stage factory; synchronous entries never import this module. */
import { fail } from "./core/error.js";
import { ownDataValue } from "./core/data.js";
import { layoutOperation } from "./core/layout-operation.js";
import { operation, ownProviders } from "./core/operation.js";
import type { ResourceProvider } from "./core/resource-types.js";
import type { OwnedResource } from "./core/owned-resource.js";
import { preparationBindings } from "./core/preparation-bindings.js";
import { lowerDrawing } from "./vdom/lower.js";
import { operationState } from "./vdom/operation-state.js";
import { preparationControls } from "./vdom/preparation.js";
import type { LowerOptions } from "./vdom/types.js";

/** Scopes, native drawing and counters belong to the eventual layout operation. */
export function createPreparingDrawingOperation(options: LowerOptions) {
  const owned = operation(options, ["registry", "resourceMetadata"]);
  let writer: ReturnType<typeof preparationBindings> | undefined;
  const fonts = Object.freeze({
    ...owned.fonts,
    get bindings() {
      return writer?.bindings ?? owned.fonts.bindings;
    },
  });
  const state = operationState(fonts, owned.budget, options);
  const bindings = preparationBindings(
    owned.fonts.bindings,
    owned.budget.policy,
    state.context.resources.map(({ id }) => id),
  );
  writer = bindings;
  state.drawing = (input, width, height, path) => lowerDrawing(input, state, width, height, path);
  const controls = preparationControls(state);
  const output = stageOutput(options, owned);
  const providers = preparationProviders(options, owned.providers, () => suspended(state));
  return {
    operation: layoutOperation(fonts, owned.budget, () => !state.closed, state, true),
    controls,
    remaining() {
      suspended(state);
      return bindings.remaining();
    },
    resourceBytes: owned.budget.policy.resourceBytes,
    appendProvider: providers.append,
    append(resource: OwnedResource, path: string) {
      if (state.closed || state.preparation !== "suspended")
        fail("MEASUREMENT_CONTEXT", path, "Preparation is not suspended");
      return bindings.append(resource, path);
    },
    options() {
      if (state.closed || state.preparation !== "suspended")
        fail("MEASUREMENT_CONTEXT", "", "Preparation cannot publish bindings");
      return Object.freeze({
        ...output,
        providers: providers.snapshot(),
        resources: bindings.seal(),
      });
    },
  };
}

function stageOutput(options: LowerOptions, owned: ReturnType<typeof operation>) {
  const capability = ownDataValue(options, "capability", "/options/capability");
  const extensions = ownDataValue(options, "extensions", "/options/extensions");
  return Object.freeze({
    limits: owned.budget.policy,
    ...(owned.fonts.service ? { text: owned.fonts.service } : {}),
    ...(capability ? { capability } : {}),
    ...(extensions ? { extensions: Object.freeze([...extensions]) } : {}),
  });
}

function preparationProviders(options: LowerOptions, initial: readonly ResourceProvider[], check: () => void) {
  const identities = new Set(ownDataValue(options, "providers", "/options/providers") ?? []);
  const providers = [...initial];
  return {
    append(provider: ResourceProvider) {
      check();
      if (identities.has(provider)) return;
      providers.push(...ownProviders([provider]));
      identities.add(provider);
    },
    snapshot: () => Object.freeze([...providers]),
  };
}

function suspended(state: { closed: boolean; preparation?: string }) {
  if (state.closed || state.preparation !== "suspended")
    fail("MEASUREMENT_CONTEXT", "/preparation", "Preparation is not suspended");
}
