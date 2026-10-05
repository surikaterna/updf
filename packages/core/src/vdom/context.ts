import { fail } from "../core/error.js";
import { snapshot } from "./data.js";
import { sameData } from "./equality.js";
import { ownNode } from "./ownership.js";
import type { State } from "./state.js";
import type { Component, DeepReadonly, Key, ProviderVNode, VDOMChild, VNode } from "./types.js";

/** Values are owned immutable snapshots; hooks are synchronous and have no effects. */
export interface ReadContext<T> {
  readonly valueType?: T;
}
/** Owned context with a synchronous Provider; nested providers shadow the copied default value. */
export interface Context<T> extends ReadContext<T> {
  readonly Provider: Component<{ readonly value: T; readonly children?: VDOMChild }>;
}
declare const rendererBinding: unique symbol;
export interface RendererBinding<T> {
  readonly [rendererBinding]: true;
  readonly valueType?: T;
}
export type ProviderEnvironment = ReadonlyMap<object, unknown>;
interface Definition {
  readonly identity: object;
  readonly value: unknown;
  readonly unavailable?: boolean;
}
interface Provider extends Definition {
  readonly children: VDOMChild;
}
interface Frame {
  readonly operation: State;
  readonly providerEnvironment: ProviderEnvironment;
  readonly phase: "expansion";
}
const contexts = new WeakMap<object, Definition>();
const rendererBindings = new WeakMap<object, Definition>();
const rendererIdentities = new WeakSet<object>();
const defaults = new WeakMap<object, unknown>();
const constructors = new WeakMap<object, Definition>();
const providers = new WeakMap<object, Provider>();
const frames: Frame[] = [];

/** Create a frozen context identity and snapshot its default data; non-data values fail with DocumentError. */
export function createContext<T>(defaultValue: T): Context<T> {
  const definition = { identity: {}, value: snapshot(defaultValue, "/context/defaultValue", false) };
  const Provider: Context<T>["Provider"] = () => fail("TYPE", "", "Providers must be library-created nodes");
  const context = Object.freeze({ Provider });
  defaults.set(definition.identity, definition.value);
  contexts.set(context, definition);
  constructors.set(Provider, definition);
  return context;
}
export function sameEnvironment(left: ProviderEnvironment, right: ProviderEnvironment): boolean {
  if (left === right) return true;
  const binding = (environment: ProviderEnvironment, identity: object): unknown =>
    environment.has(identity) ? environment.get(identity) : defaults.get(identity);
  for (const identity of left.keys()) if (!sameData(binding(left, identity), binding(right, identity))) return false;
  for (const identity of right.keys())
    if (!left.has(identity) && !sameData(binding(left, identity), binding(right, identity))) return false;
  return true;
}
export function createRendererContext<T>(): { readonly context: ReadContext<T>; readonly binding: RendererBinding<T> } {
  const context = Object.freeze({});
  const binding = Object.freeze({}) as RendererBinding<T>;
  const definition = { identity: {}, value: undefined, unavailable: true };
  contexts.set(context, definition);
  rendererBindings.set(binding, definition);
  rendererIdentities.add(definition.identity);
  return Object.freeze({ context, binding });
}
export function scopedEnvironment(captured: ProviderEnvironment, current: ProviderEnvironment): ProviderEnvironment {
  const next = new Map(captured);
  // Author scopes retain providers, while final-only bindings belong to the current emission.
  for (const [identity, value] of current) if (rendererIdentities.has(identity)) next.set(identity, value);
  return next;
}
export function bindRendererContext<T>(
  environment: ProviderEnvironment,
  binding: RendererBinding<T>,
  value: T,
): ProviderEnvironment {
  const definition = rendererBindings.get(binding);
  if (!definition) fail("TYPE", "", "Expected renderer-owned binding");
  const next = new Map(environment);
  next.set(definition.identity, snapshot(value, "/context/final", false));
  return next;
}
/** Read the nearest provider/default during synchronous component execution; outside it fails MEASUREMENT_CONTEXT. */
export function useContext<T>(context: Context<T>): DeepReadonly<T>;
/** Read an owned context; renderer-only contexts may be unavailable before finalization. */
export function useContext<T>(context: ReadContext<T>): DeepReadonly<T>;
export function useContext<T>(context: Context<T> | ReadContext<T>): DeepReadonly<T> {
  const frame = frames.at(-1);
  if (!frame || frame.operation.closed) fail("MEASUREMENT_CONTEXT", "", "useContext requires component execution");
  const definition = contexts.get(context);
  if (!definition) fail("TYPE", "", "Expected a library-created context");
  const environment = frame.providerEnvironment;
  if (definition.unavailable && !environment.has(definition.identity))
    fail("MEASUREMENT_CONTEXT", "", "Renderer context is unavailable before finalization");
  return (
    environment.has(definition.identity) ? environment.get(definition.identity) : definition.value
  ) as DeepReadonly<T>;
}
export function providerNode(type: object, props: Record<string, unknown>, key?: Key): VNode | undefined {
  const definition = constructors.get(type);
  if (!definition) return undefined;
  for (const field of Object.keys(props))
    if (field !== "value" && field !== "children") fail("KEY", `/props/${field}`, "Unsupported provider prop");
  if (!("value" in props)) fail("TYPE", "/props/value", "Provider requires a value");
  const value = snapshot(props.value, "/props/value", false);
  const children = snapshot(props.children, "/props/children") as VDOMChild;
  const node = ownNode({ kind: "provider", ...(key === undefined ? {} : { key }) });
  providers.set(node, { ...definition, value, children });
  return node;
}
export function enterProvider(
  node: ProviderVNode,
  state: State,
): { children: VDOMChild; previous: ProviderEnvironment } {
  const provider = providers.get(node);
  if (!provider) fail("TYPE", "", "Expected an owned provider");
  const previous = state.environment;
  const next = new Map(previous);
  next.set(provider.identity, provider.value);
  state.environment = next;
  return { children: provider.children, previous };
}
export function execute<T>(state: State, invoke: () => T): T {
  frames.push({ operation: state, providerEnvironment: state.environment, phase: "expansion" });
  try {
    return invoke();
  } finally {
    frames.pop();
  }
}
