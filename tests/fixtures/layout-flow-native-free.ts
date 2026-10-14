import { FragmentState } from "../../packages/layout/src/flow-runtime/fragment-state.js";
import type { FragmentProducer, PaintProducer } from "../../packages/layout/src/flow-runtime/protocol.js";
import { resolveFragment, resolvePaint } from "../../packages/layout/src/flow-runtime/runtime.js";

interface Request {
  readonly token: object;
}
interface Fragment {
  readonly token: object;
}
interface Context {
  readonly token: object;
}
interface Node {
  readonly token: object;
}

export function nativeFreeWitness(): FragmentState {
  const token = {};
  const request = { token };
  const selected = { token };
  const nodes = [{ token }];
  const child: FragmentProducer<Request, Fragment> = { fragment: () => selected };
  const block: FragmentProducer<Request, Fragment> = {
    fragment: () => undefined,
    *fragmentSteps(input) {
      if (input !== request || this !== block) throw new Error("Fragment receiver/request changed");
      return yield { block: child, request: input };
    },
  };
  const leaf: PaintProducer<Context, Node> = { paint: () => nodes };
  const fragment: PaintProducer<Context, Node> = {
    paint: () => [],
    *paintSteps(context) {
      if (context !== request || this !== fragment) throw new Error("Paint receiver/context changed");
      return yield { fragment: leaf, context };
    },
  };
  if (resolveFragment(block, request) !== selected) throw new Error("Fragment identity changed");
  if (resolvePaint(fragment, request) !== nodes) throw new Error("Paint identity changed");
  const state = new FragmentState();
  const candidate = state.fork();
  candidate.set(token, 0, 3n);
  if (state.get(token, 0) !== undefined) throw new Error("Candidate leaked");
  state.adopt(candidate);
  if (state.get(token, 0) !== 3n) throw new Error("Candidate not adopted");
  return state;
}

export { resolveFragment, resolvePaint };
export type { FragmentProducer, PaintProducer };
