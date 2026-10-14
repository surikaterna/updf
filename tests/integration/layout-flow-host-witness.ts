import type { NodeDefinition } from "@updf/core";
import type { FragmentProducer, PaintProducer } from "../../packages/layout/src/flow-runtime/protocol.js";
import { resolveFragment, resolvePaint } from "../../packages/layout/src/flow-runtime/runtime.js";
import { checkLimit } from "@updf/core/internal";
import {
  stack,
  stackHeight,
  type Stack,
  type StackChild,
} from "../../packages/layout/src/flow-composition/stack-model.js";
import type {
  FragmentPaintContext,
  FragmentRequest,
  PlacedFragment,
  PreparedBlock,
} from "../../packages/layout/src/protocol.js";

export function fragmentWitness(block: PreparedBlock, request: FragmentRequest): PlacedFragment | undefined {
  const producer: FragmentProducer<FragmentRequest, PlacedFragment> = block;
  return resolveFragment<FragmentRequest, PlacedFragment>(producer, request);
}
export function paintWitness(fragment: PlacedFragment, context: FragmentPaintContext): readonly NodeDefinition[] {
  const producer: PaintProducer<FragmentPaintContext, NodeDefinition> = fragment;
  return resolvePaint<FragmentPaintContext, NodeDefinition>(producer, context);
}

export function stackModelHostWitness(block: PreparedBlock): Stack<PreparedBlock> {
  const child: StackChild = block;
  stackHeight([child], 0);
  return stack<PreparedBlock>([block], 0, 0, 1, "/witness", checkLimit);
}
