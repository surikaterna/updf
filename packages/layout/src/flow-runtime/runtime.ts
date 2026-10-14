import type { FragmentCall, FragmentProducer, PaintCall, PaintProducer } from "./protocol.js";

/** Heap continuations belong only to internal producers; executable public callbacks remain synchronous. */
export function resolveFragment<Request, Fragment>(
  block: FragmentProducer<Request, Fragment>,
  request: Request,
): Fragment | undefined {
  if (!block.fragmentSteps) return block.fragment(request);
  const pending: Generator<FragmentCall<Request, Fragment>, Fragment | undefined, Fragment | undefined>[] = [
    block.fragmentSteps(request),
  ];
  let result: Fragment | undefined;
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
export function resolvePaint<Context, Node>(fragment: PaintProducer<Context, Node>, context: Context): readonly Node[] {
  if (!fragment.paintSteps) return fragment.paint(context);
  const pending: Generator<PaintCall<Context, Node>, readonly Node[], readonly Node[]>[] = [
    fragment.paintSteps(context),
  ];
  let result: readonly Node[] = [];
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
