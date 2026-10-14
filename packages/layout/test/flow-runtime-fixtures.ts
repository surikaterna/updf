import type { NodeDefinition } from "@updf/core";
import { policy } from "@updf/core/internal";
import { OutputBudget } from "../dist/cjs/budget.js";
import type { FragmentPaintContext, FragmentRequest, PlacedFragment, PreparedBlock } from "../dist/cjs/protocol.js";

export function request(overrides: Partial<FragmentRequest> = {}): FragmentRequest {
  return {
    offset: 0,
    availableHeight: 40,
    freshHeight: 40,
    atFreshRegion: true,
    width: 100,
    usedHeight: 0,
    ...overrides,
  };
}
export function context(): FragmentPaintContext {
  return { x: 2, y: 3, budget: new OutputBudget(policy()), start: (offset) => offset };
}
export function fragment(overrides: Partial<PlacedFragment> = {}): PlacedFragment {
  return { height: 10, nextOffset: 1, paint: () => [], ...overrides };
}
export function producer(overrides: Partial<PreparedBlock> = {}): PreparedBlock {
  return {
    fragmentation: "atomic",
    naturalSize: { width: 100, height: 10 },
    extent: 1,
    fragment: () => fragment(),
    ...overrides,
  };
}
export function marker(x: number): NodeDefinition {
  return { type: "rect", x: x + 1, y: 1, width: 1, height: 1 };
}

export function observed<Call, Result>(
  iterator: Generator<Call, Result, Result>,
  inputs: Result[],
): Generator<Call, Result, Result> {
  const next = iterator.next.bind(iterator);
  iterator.next = (...args: [] | [Result]) => {
    inputs.push(args[0] as Result);
    return next(...args);
  };
  return iterator;
}
