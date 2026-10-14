import type { NodeDefinition } from "@updf/core";
import {
  resolveFragment as resolveGenericFragment,
  resolvePaint as resolveGenericPaint,
} from "./flow-runtime/runtime.js";
import type { FragmentPaintContext, FragmentRequest, PlacedFragment, PreparedBlock } from "./protocol.js";

export function resolveFragment(block: PreparedBlock, request: FragmentRequest): PlacedFragment | undefined {
  return resolveGenericFragment<FragmentRequest, PlacedFragment>(block, request);
}
export function resolvePaint(fragment: PlacedFragment, context: FragmentPaintContext): readonly NodeDefinition[] {
  return resolveGenericPaint<FragmentPaintContext, NodeDefinition>(fragment, context);
}
