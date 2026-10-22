import type { WorkLedger } from "../measurement/ledger.js";
import type { OwnedResource } from "./owned-resource.js";
import { fail } from "./error.js";

declare const capabilityBrand: unique symbol;
/** One explicitly selected, owned operation capability; never a name-based registry. */
export interface OperationCapability<T> {
  readonly [capabilityBrand]: T;
}
export interface CapabilityScope {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly budget: WorkLedger;
  readonly check: (path?: string) => void;
}
export interface CapabilityOrigin {
  readonly path: string;
}
export interface CapabilityLifetime {
  readonly active: boolean;
}
type Factory<T> = (scope: CapabilityScope) => (origin: CapabilityOrigin, check: () => void) => T;
const factories = new WeakMap<object, Factory<unknown>>();
const scopes = new WeakSet<object>();
interface Selection {
  readonly capability: object;
  readonly scope: CapabilityScope;
  bind?: ReturnType<Factory<unknown>>;
}
const selections = new WeakMap<object, Selection>();
const contexts = new WeakMap<
  object,
  {
    readonly operation: object;
    readonly origin: CapabilityOrigin;
    readonly lifetime: CapabilityLifetime;
  }
>();

export function createOperationCapability<T>(initialize: Factory<T>): OperationCapability<T> {
  const identity = Object.freeze(Object.create(null)) as OperationCapability<T>;
  factories.set(identity, initialize);
  return identity;
}
export function ownOperationCapability(value: unknown): object | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || !factories.has(value))
    fail("MEASUREMENT_CONTEXT", "/options/capability", "Expected owned operation capability");
  return value;
}
export function selectOperationCapability(
  operation: object,
  capability: object,
  scope: CapabilityScope,
  owner: object,
): void {
  const previous = selections.get(owner);
  if (previous) {
    selections.set(operation, previous);
    return;
  }
  scopes.add(scope);
  const selection = { capability, scope };
  selections.set(owner, selection);
  selections.set(operation, selection);
}
export function checkCapabilityScope(scope: CapabilityScope): void {
  if (!scopes.has(scope)) fail("MEASUREMENT_CONTEXT", "", "Expected active capability scope");
  scope.check();
}
export function bindOperationCapabilityContext(
  context: object,
  operation: object,
  origin: CapabilityOrigin,
  lifetime: CapabilityLifetime,
): void {
  contexts.set(context, { operation, origin, lifetime });
}
export function useOperationCapability<T>(context: object, capability: OperationCapability<T>): T {
  const binding = contexts.get(context);
  const path = binding?.origin.path ?? "";
  if (!binding || !binding.lifetime.active) fail("MEASUREMENT_CONTEXT", path, "Expected active operation context");
  const selected = selections.get(binding.operation);
  if (!selected || selected.capability !== capability)
    fail("MEASUREMENT_CONTEXT", path, "Operation capability is not selected");
  selected.scope.check(path);
  selected.bind ??= factories.get(capability)!(selected.scope);
  return selected.bind(binding.origin, () => {
    if (!binding.lifetime.active) fail("MEASUREMENT_CONTEXT", binding.origin.path, "Operation context has closed");
    selected.scope.check(binding.origin.path);
  }) as T;
}
