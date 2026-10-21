import type { NodeDefinition } from "@updf/core";
import { assertPreparedChild, assertPreparedPaint } from "./fragment-paint-preparation.js";
import type {
  FragmentCall,
  PreparedFragmentPaint,
  FragmentRequest,
  PlacedFragment,
  PreparedBlock,
} from "./protocol.js";

/** Heap continuations belong only to internal producers; executable public callbacks remain synchronous. */
export function resolveFragment(block: PreparedBlock, request: FragmentRequest): PlacedFragment | undefined {
  if (!block.fragmentSteps) return block.fragment(request);
  const pending: Generator<FragmentCall, PlacedFragment | undefined, PlacedFragment | undefined>[] = [
    block.fragmentSteps(request),
  ];
  let result: PlacedFragment | undefined;
  while (pending.length) {
    const step = pending.at(-1)?.next(result);
    if (!step) break;
    result = undefined;
    if (step.done) {
      pending.pop();
      result = step.value;
      continue;
    }
    const { block, request } = step.value;
    if (block.fragmentSteps) pending.push(block.fragmentSteps(request));
    else result = block.fragment(request);
  }
  return result;
}
export function resolvePaint({ fragment, context }: PreparedFragmentPaint): readonly NodeDefinition[] {
  assertPreparedPaint(fragment, context);
  if (!fragment.paintSteps) return fragment.paint(context);
  const pending = [{ context, steps: fragment.paintSteps(context) }];
  let result: readonly NodeDefinition[] = [];
  while (pending.length) {
    const current = pending.at(-1)!;
    const step = current.steps.next(result);
    if (!step) break;
    result = [];
    if (step.done) {
      pending.pop();
      result = step.value;
      continue;
    }
    assertPreparedChild(current.context, step.value);
    const { fragment, context } = step.value;
    if (fragment.paintSteps) pending.push({ context, steps: fragment.paintSteps(context) });
    else result = fragment.paint(context);
  }
  return result;
}
