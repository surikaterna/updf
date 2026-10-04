import type { NodeDefinition } from "@updf/core";
import { type LayoutOperation, type NormalizedContent, ownContentData, snapshotData } from "@updf/core/internal";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import {
  checkSharedEdgeOperation,
  copySharedEdgeNode,
  isSharedEdgeNode,
  sharedEdgeGeometry,
} from "./shared-edge-emission.js";

export interface EmissionOrigin {
  readonly from: string;
  readonly to: string;
  readonly previous?: EmissionOrigin;
}
export interface DecorationOwner {
  count: number;
  extensions: Extensions | undefined;
  lifetime: ExtensionLifetime | undefined;
  readonly origin?: EmissionOrigin;
}
export interface DecorationRecipe {
  readonly node: NormalizedContent;
  readonly owner: DecorationOwner;
}
export interface DecorationEmission extends DecorationRecipe {
  readonly index: number;
  readonly width: number;
  readonly height: number;
}
const emissions = new WeakMap<object, DecorationEmission>();
const wrappers = new WeakMap<object, string>();
const origins = new WeakMap<LayoutOperation, EmissionOrigin>();
export const emission = (node: object): DecorationEmission | undefined => emissions.get(node);
export const wrapperPath = (node: object): string | undefined => wrappers.get(node);
export const isEmissionNode = (value: unknown): boolean =>
  !!value && typeof value === "object" && (emissions.has(value) || wrappers.has(value));
export function ownEmission(node: NodeDefinition, value: DecorationEmission): NodeDefinition {
  const owned = ownContentData(snapshotData(node, value.node.path));
  emissions.set(owned, value);
  return owned;
}
export function ownEmissionWrapper(node: NodeDefinition, path: string): NodeDefinition {
  const owned = ownContentData(snapshotEmissionData(node, path));
  wrappers.set(owned, path);
  return owned;
}
export function snapshotEmissionData<T>(value: T, path: string): T {
  return snapshotData(value, path, (node) => isEmissionNode(node) || isSharedEdgeNode(node));
}
export function emissionPath(path: string, origin?: EmissionOrigin): string {
  const chain: EmissionOrigin[] = [];
  for (let current = origin; current; current = current.previous) chain.push(current);
  while (chain.length) {
    const current = chain.pop();
    if (current && (path === current.from || path.startsWith(`${current.from}/`)))
      path = current.to + path.slice(current.from.length);
  }
  return path;
}
function composeOrigin(
  previous: EmissionOrigin | undefined,
  next: EmissionOrigin | undefined,
): EmissionOrigin | undefined {
  return previous && next ? Object.freeze({ ...next, previous }) : (next ?? previous);
}
export const currentEmissionOrigin = (operation: LayoutOperation): EmissionOrigin | undefined => origins.get(operation);
export function currentEmissionPath(operation: LayoutOperation, path: string): string {
  return emissionPath(path, origins.get(operation));
}
export function withEmissionOrigin<T>(
  operation: LayoutOperation,
  origin: EmissionOrigin | undefined,
  callback: () => T,
): T {
  if (!origin) return callback();
  const previous = origins.get(operation);
  const composed = composeOrigin(previous, origin);
  if (composed) origins.set(operation, composed);
  try {
    return callback();
  } finally {
    if (previous) origins.set(operation, previous);
    else origins.delete(operation);
  }
}
export function instantiateEmissionNodes(
  nodes: readonly NodeDefinition[],
  origin?: EmissionOrigin,
): readonly NodeDefinition[] {
  const owners = new Map<DecorationOwner, DecorationOwner>();
  return mapNodes(
    nodes,
    (node) => {
      const value = emissions.get(node);
      if (!value) return undefined;
      const composed = composeOrigin(value.owner.origin, origin);
      const owner = owners.get(value.owner) ?? { ...value.owner, ...(composed ? { origin: composed } : {}) };
      owners.set(value.owner, owner);
      return ownEmission(node, { ...value, owner });
    },
    (previous, copy) => copySharedEdgeNode(previous, copy, (path) => emissionPath(path, origin)),
  );
}
export function geometryNodes(
  nodes: readonly NodeDefinition[],
  operation?: LayoutOperation,
): readonly NodeDefinition[] {
  return mapNodes(
    nodes,
    (node) => {
      if (operation) checkSharedEdgeOperation(node, operation);
      return isEmissionNode(node) ? null : undefined;
    },
    sharedEdgeGeometry,
  );
}
function mapNodes(
  nodes: readonly NodeDefinition[],
  replace: (node: NodeDefinition) => NodeDefinition | null | undefined,
  copyNode: (previous: NodeDefinition, copy: NodeDefinition) => NodeDefinition = (_, copy) => copy,
): readonly NodeDefinition[] {
  const output: NodeDefinition[] = [],
    tasks: (() => void)[] = [];
  const visit = (node: NodeDefinition, into: NodeDefinition[]): void => {
    const replaced = replace(node);
    if (replaced !== undefined) {
      if (replaced) into.push(replaced);
      return;
    }
    if (node.type !== "paintGroup") {
      into.push(node);
      return;
    }
    const children: NodeDefinition[] = [];
    tasks.push(() => {
      const copy = { ...node, children };
      const path = wrappers.get(node);
      into.push(copyNode(node, path ? ownEmissionWrapper(copy, path) : copy));
    });
    schedule(node.children, children);
  };
  const schedule = (values: readonly NodeDefinition[], into: NodeDefinition[]): void => {
    for (let i = values.length - 1; i >= 0; i--) {
      const node = values[i];
      if (node) tasks.push(() => visit(node, into));
    }
  };
  schedule(nodes, output);
  while (tasks.length) tasks.pop()?.();
  return output;
}
