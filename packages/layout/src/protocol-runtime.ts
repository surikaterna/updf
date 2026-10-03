import type { NodeDefinition } from "@updf/core";
import type {
  FragmentCall,
  FragmentPaintContext,
  FragmentRequest,
  PaintCall,
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
export function resolvePaint(fragment: PlacedFragment, context: FragmentPaintContext): readonly NodeDefinition[] {
  if (!fragment.paintSteps) return fragment.paint(context);
  const pending: Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]>[] = [
    fragment.paintSteps(context),
  ];
  let result: readonly NodeDefinition[] = [];
  while (pending.length) {
    const step = pending.at(-1)?.next(result);
    if (!step) break;
    result = [];
    if (step.done) {
      pending.pop();
      result = step.value;
      continue;
    }
    const { fragment, context } = step.value;
    if (fragment.paintSteps) pending.push(fragment.paintSteps(context));
    else result = fragment.paint(context);
  }
  return result;
}
