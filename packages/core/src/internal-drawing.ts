/**
 * `@updf/core/internal-drawing`: unstable sibling-package drawing coordinator bridge.
 * Not a supported consumer API; no compatibility guarantee is introduced by these docs.
 * @module
 */
import { layoutOperation } from "./core/layout-operation.js";
import { operation } from "./core/operation.js";
import { lowerDrawing } from "./vdom/lower.js";
import { operationState } from "./vdom/operation-state.js";
import type { LowerOptions } from "./vdom/types.js";

/** Optional document coordinator entry; measurement and table entries do not import it. */
export function createDrawingLayoutOperation(options: LowerOptions) {
  const owned = operation(options, ["registry", "resourceMetadata"]);
  const state = operationState(owned.fonts, owned.budget, options);
  state.drawing = (input, width, height, path) => lowerDrawing(input, state, width, height, path);
  const adapter = layoutOperation(owned.fonts, owned.budget, () => !state.closed, state);
  return Object.freeze({
    ...adapter,
    close() {
      state.closed = true;
    },
  });
}
