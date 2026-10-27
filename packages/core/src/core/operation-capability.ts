import type { WorkLedger } from "../measurement/ledger.js";
import type { OwnedResource } from "./owned-resource.js";
import { DocumentError, fail } from "./error.js";
import type { ExtensionSelection } from "./operation-extension.js";
import type { TextServiceProvider } from "./text-service-request.js";

declare const capabilityBrand: unique symbol;
/** One explicitly selected, owned operation capability; never a name-based registry. */
export interface OperationCapability<T> {
  readonly [capabilityBrand]: T;
}
export interface CapabilityScope {
  readonly bindings: ReadonlyMap<string, OwnedResource>;
  readonly budget: WorkLedger;
  readonly check: (path?: string) => void;
  readonly textProvider?: TextServiceProvider;
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
  readonly feature?: object;
  readonly capability: object;
  readonly scope: CapabilityScope;
  bind?: ReturnType<Factory<unknown>>;
  initializing?: boolean;
  recursive?: boolean;
}
interface Selected {
  readonly legacy?: Selection;
  readonly extensions?: readonly Selection[];
}
const selections = new WeakMap<object, Selected>();
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
  capability: object | undefined,
  scope: CapabilityScope,
  owner: object,
  extensions?: readonly ExtensionSelection[],
): void {
  const previous = selections.get(owner);
  if (previous) {
    selections.set(operation, previous);
    return;
  }
  scopes.add(scope);
  const selection: Selected = {
    ...(capability ? { legacy: { capability, scope } } : {}),
    ...(extensions
      ? { extensions: extensions.map(({ feature, capability }) => ({ feature, capability, scope })) }
      : {}),
  };
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
  return useSelection(context, (collection) =>
    collection?.legacy?.capability === capability
      ? collection.legacy
      : collection?.extensions?.find((item) => item.capability === capability),
  );
}
/** Resolve only a feature explicitly selected in the bound operation. */
export function useOperationExtension<T>(context: object, feature: object): T {
  return useSelection(context, (collection) => collection?.extensions?.find((item) => item.feature === feature));
}
function useSelection<T>(context: object, select: (collection: Selected | undefined) => Selection | undefined): T {
  const binding = contexts.get(context);
  const path = binding?.origin.path ?? "";
  if (!binding || !binding.lifetime.active) fail("MEASUREMENT_CONTEXT", path, "Expected active operation context");
  const collection = selections.get(binding.operation);
  const selected = select(collection);
  if (!selected) fail("MEASUREMENT_CONTEXT", path, "Operation capability is not selected");
  selected.scope.check(path);
  initialize(selected, path);
  return selected.bind!(binding.origin, () => {
    if (!binding.lifetime.active) fail("MEASUREMENT_CONTEXT", binding.origin.path, "Operation context has closed");
    selected.scope.check(binding.origin.path);
  }) as T;
}
function initialize(selected: Selection, path: string): void {
  if (selected.bind) return;
  if (selected.initializing) {
    selected.recursive = true;
    fail("MEASUREMENT_CONTEXT", path, "Recursive operation capability initialization");
  }
  selected.initializing = true;
  let active = true;
  const scope: CapabilityScope = {
    ...selected.scope,
    check(path) {
      if (!active) fail("MEASUREMENT_CONTEXT", path ?? "", "Capability initialization has failed");
      selected.scope.check(path);
    },
  };
  scopes.add(scope);
  try {
    const bind = factories.get(selected.capability)!(scope);
    if (selected.recursive) fail("MEASUREMENT_CONTEXT", path, "Recursive operation capability initialization");
    if (typeof bind !== "function") fail("MEASUREMENT_CONTEXT", path, "Expected operation capability binding");
    selected.bind = bind;
  } catch (error) {
    active = false;
    if (error instanceof DocumentError && error.diagnostics[0]?.path === "") {
      const diagnostic = error.diagnostics[0];
      throw new DocumentError(diagnostic.code, path, diagnostic.message, diagnostic);
    }
    throw error;
  } finally {
    selected.initializing = false;
    selected.recursive = false;
  }
}
