import { fail } from "../core/error.js";
import type { State } from "./state.js";

export function checkState(state: State, path = ""): void {
  if (state.closed || state.preparation === "suspended" || state.preparation === "sealed")
    fail("MEASUREMENT_CONTEXT", path, "Lowering operation is unavailable");
}

export function checkGeometry(state: State, path = ""): void {
  checkState(state, path);
  if (state.preparation === "capturing") fail("MEASUREMENT_CONTEXT", path, "Geometry requires sealed preparation");
}
