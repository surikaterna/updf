import type { OutputBudget } from "../dist/cjs/budget.js";
import { prepareFragmentPaint } from "../dist/cjs/fragment-paint-preparation.js";
import type { PlacedFragment } from "../dist/cjs/protocol.js";
import { resolvePaint } from "../dist/cjs/protocol-runtime.js";

export function paintPrepared(fragment: PlacedFragment, budget: OutputBudget, x = 0, y = 0) {
  const prepared = prepareFragmentPaint(fragment, { x, y }, budget, "/paint");
  return resolvePaint(prepared.root);
}
