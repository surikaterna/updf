import { fail } from "../core/error.js";
import { type ProviderEnvironment, sameEnvironment } from "./context.js";
import { sameData } from "./equality.js";

interface Invocation {
  readonly type: object;
  readonly props: unknown;
}
export interface Expansion extends Invocation {
  readonly environment: ProviderEnvironment;
}
const invocations = new WeakMap<object, Invocation>();
export function ownInvocation<T extends object>(node: T, type: object, props: unknown): T {
  invocations.set(node, { type, props });
  return node;
}
/** Reject a repeated deterministic invocation on the active expansion chain, not repeated siblings. */
export function beginExpansion(
  node: object,
  active: Expansion[],
  environment: ProviderEnvironment,
  path: string,
): void {
  const invocation = invocations.get(node);
  if (!invocation) return;
  if (
    active.some(
      (item) =>
        item.type === invocation.type &&
        sameEnvironment(item.environment, environment) &&
        sameData(item.props, invocation.props),
    )
  )
    fail("VDOM_CYCLE", path, "Component expansion made no data progress");
  active.push({ ...invocation, environment });
}
