import {
  fail,
  isContentData,
  isVNode,
  type LayoutOperation,
  type NormalizedContent,
  ownContentData,
  semanticComponent,
  snapshotData,
} from "@updf/core/internal";
import { Fragment } from "@updf/core/jsx-runtime";
import { isOwnedResource } from "@updf/core/resources";
import type { BlockComponent, BlockContent } from "./content-types.js";
import { currentEmissionPath } from "./emission-nodes.js";
import type {
  BlockAdapter,
  BlockAdapterIdentity,
  BlockPart,
  BlockPartComponent,
  BlockPartIdentity,
  ScopedContent,
} from "./extension-types.js";
import { cloneExtension, extension, isExtensionBlock } from "./extensions.js";

const adapters = new WeakMap<object, BlockAdapterIdentity>();
const slots = new WeakMap<object, BlockPartIdentity>();
const identities = new WeakMap<object, object>();
const captures = new WeakMap<object, { input: unknown; scope: object; operation: LayoutOperation; path: string }>();
const scopes = new WeakMap<object, { scope: object; operation: LayoutOperation }>();

export const adapterSnapshot = <T>(value: T, path: string): T =>
  snapshotData(
    value,
    path,
    (item) => isContentData(item) || (isVNode(item) && (item.kind !== "native" || item.tag === Fragment)),
  );

export function blockComponent<P extends object>(adapter: BlockAdapter<P>): BlockComponent<P> {
  const identity = Object.freeze({});
  adapters.set(identity, adapter);
  return semanticComponent<P>(identity, true) as BlockComponent<P>;
}
export function defineBlockPart<P extends object>(name: string): BlockPartComponent<P> {
  if (!/^[A-Za-z][A-Za-z0-9.-]*$/u.test(name)) fail("TYPE", "/part/name", "Expected part name");
  const identity = Object.freeze({});
  const component = semanticComponent<P>(identity, true) as BlockPartComponent<P>;
  const part = component as BlockPartIdentity;
  slots.set(identity, part);
  identities.set(part, identity);
  return component;
}
export const isAdapterComponent = (identity: object): boolean => adapters.has(identity);
export function authorBlock(node: NormalizedContent, operation: LayoutOperation) {
  if (typeof node.value === "string") return undefined;
  const adapter = adapters.get(node.value.identity);
  if (!adapter) return undefined;
  const descriptor = extension(adapter as BlockAdapter<Readonly<Record<string, unknown>>>, node.value.props);
  if (node.scope) scopes.set(descriptor, { scope: node.scope, operation });
  return descriptor;
}
export function scopedAdapter<T>(value: object, invoke: () => T): T {
  const captured = scopes.get(value);
  return captured ? captured.operation.scoped(captured.scope, invoke) : invoke();
}
export function scopeDataBlock(value: unknown, scope: object | undefined, operation: LayoutOperation) {
  if (!isExtensionBlock(value) || !scope || !needsScope(value.props)) return value;
  const copy = cloneExtension(value);
  scopes.set(copy, { scope, operation });
  return copy;
}
function needsScope(input: unknown): boolean {
  const pending: unknown[] = [input],
    seen = new Set<object>();
  while (pending.length) {
    const value = pending.pop();
    if (isVNode(value) || (value && typeof value === "object" && captures.has(value))) return true;
    if (!value || typeof value !== "object" || isOwnedResource(value) || seen.has(value)) continue;
    seen.add(value);
    for (const child of Object.values(value)) pending.push(child);
  }
  return false;
}
export function scopedContent<T>(
  value: unknown,
  operation: LayoutOperation,
  invoke: (input: unknown, path?: string) => T,
): T {
  let input = value,
    scope: object | undefined,
    path: string | undefined;
  const seen = new Set<object>();
  while (input && typeof input === "object") {
    const captured = captures.get(input);
    if (!captured) break;
    if (captured.operation !== operation)
      fail("MEASUREMENT_CONTEXT", captured.path, "Content belongs to another operation");
    if (seen.has(input)) fail("VDOM_CYCLE", captured.path, "Cyclic captured content");
    seen.add(input);
    scope = captured.scope;
    path = captured.path;
    input = captured.input;
  }
  return scope
    ? operation.scoped(scope, () =>
        invoke(input, path === undefined ? undefined : currentEmissionPath(operation, path)),
      )
    : invoke(input);
}
export function captureContent(input: unknown, node: NormalizedContent, operation: LayoutOperation): ScopedContent {
  if (!node.scope) fail("MEASUREMENT_CONTEXT", node.path, "Expected captured content scope");
  const content = ownContentData(Object.freeze({})) as ScopedContent;
  captures.set(content, { input, scope: node.scope, operation, path: `${node.path}/children` });
  return content;
}
export function readParts(
  input: BlockContent,
  allowed: readonly BlockPartIdentity[],
  operation: LayoutOperation,
  path: string,
): readonly BlockPart[] {
  return scopedContent(input, operation, (content, source = path) => {
    const accepted = new Set(allowed.map((part) => identities.get(part)));
    const nodes = operation.normalizeContent(
      content,
      () => fail("TYPE", source, "Expected JSX author parts"),
      source,
      (value, at) => {
        if (typeof value === "string" || !accepted.has(value.identity))
          fail("VDOM_HIERARCHY", at, "Unexpected author part");
      },
    );
    return Object.freeze(nodes.map((node) => capturePart(node, operation)));
  });
}
function capturePart(node: NormalizedContent, operation: LayoutOperation): BlockPart {
  if (typeof node.value === "string" || !node.scope) fail("TYPE", node.path, "Expected author part");
  const part = slots.get(node.value.identity);
  if (!part) fail("TYPE", node.path, "Expected owned author part");
  const { children, ...props } = node.value.props;
  const content = ownContentData(Object.freeze({})) as ScopedContent;
  captures.set(content, { input: children, scope: node.scope, operation, path: `${node.path}/children` });
  return Object.freeze({
    part,
    props: adapterSnapshot(props, node.path),
    content,
    sourcePath: node.path,
    ...(node.key === undefined ? {} : { key: node.key }),
  });
}
