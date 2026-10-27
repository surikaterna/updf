import {
  fail,
  ownContentData,
  semanticComponent,
  type SemanticRecipe,
  type LayoutOperation,
  type NormalizedContent,
} from "@updf/core/internal";
import { compile, type CompilerScope } from "./block-compiler.js";
import { blockIdentity, dataRecipe } from "./content-data.js";
import { checkBlockChildRole } from "./content-role.js";
import { authorParagraph, type AuthorParagraph, convertBlocks } from "./content-normalize.js";
import type { FlowBlock } from "./types.js";
import type { PreparedBlock } from "./protocol.js";
import type { BlockComponent, BlockContent, ContentBlockProps } from "./content-types.js";
import { associateVisualPreparation, visualPreparationOwner, ownedVisualComponent } from "./visual-owner.js";
import { resolvedVisualSource } from "./visual-preparation-state.js";
import { scopedContent } from "./author-parts.js";
import { associateParticipationPreparation, ownParticipationPreparation } from "./participation-preparation.js";
import { hasVisualReference, readVisualReference, type VisualRectangle } from "./visual-reference.js";

declare const participationBrand: unique symbol;
export interface FlowParticipation {
  readonly [participationBrand]: true;
}
export interface ParticipationSource {
  readonly block: FlowBlock;
  readonly author?: AuthorParagraph;
  readonly data?: object;
  readonly index: number;
  readonly path: string;
  readonly key: string | number | null;
}
export interface ParticipationContext extends CompilerScope {
  readonly width: number;
  readonly prepare: (source: ParticipationSource, width?: number) => PreparedBlock;
  readonly reference: (source: ParticipationSource, prepared: PreparedBlock) => VisualRectangle;
}
export interface ParticipationResult {
  readonly blocks: readonly PreparedBlock[];
  readonly close: () => void;
}
type Compiler = (sources: readonly ParticipationSource[], context: ParticipationContext) => ParticipationResult;
interface Owner {
  readonly handle: FlowParticipation;
  readonly compiler: Compiler;
  readonly captures: WeakMap<object, Capture>;
}
type Capture = (
  props: Readonly<Record<string, unknown>>,
  path: string,
) => {
  readonly props: ContentBlockProps;
  readonly data: object;
  readonly body?: BlockContent;
};
let owners: WeakMap<object, Owner> | undefined;
export function defineParticipation(compiler: Compiler): FlowParticipation {
  const handle = ownContentData(Object.freeze({})) as unknown as FlowParticipation;
  owners ??= new WeakMap();
  owners.set(handle, { compiler, handle, captures: new WeakMap() });
  ownParticipationPreparation(handle);
  return handle;
}
/** A contribution may carry private preparation while retaining one compiler/capture owner. */
export function aliasParticipation(owner: FlowParticipation): FlowParticipation {
  checkParticipation(owner);
  const alias = ownContentData(Object.freeze({})) as unknown as FlowParticipation;
  owners!.set(alias, owners!.get(owner)!);
  return alias;
}
function canonicalParticipation(owner: FlowParticipation): FlowParticipation {
  checkParticipation(owner);
  return owners!.get(owner)!.handle;
}
export function participationComponent<P extends object>(
  owner: FlowParticipation,
  capture: (
    props: Readonly<Record<string, unknown>>,
    path: string,
  ) => { readonly props: ContentBlockProps; readonly data: object; readonly body?: BlockContent },
  visualBase?: object,
): BlockComponent<P> {
  checkParticipation(owner);
  const identity = Object.freeze({});
  owners!.get(owner)!.captures.set(identity, capture);
  owners!.set(identity, owners!.get(owner)!);
  associateParticipationPreparation(identity, { identity: owner, capture });
  if (visualBase !== undefined) {
    const visual = visualPreparationOwner(visualBase);
    if (!visual || !ownedVisualComponent(visualBase))
      fail("TYPE", "/participation/visualBase", "Expected owned visual component");
    associateVisualPreparation(identity, { ...visual, capture });
  }
  return semanticComponent<Record<string, unknown>>(identity) as unknown as BlockComponent<P>;
}
/** Marker identities share the existing owner table; installation never changes their identity. */
export function markerParticipation(value: string | SemanticRecipe): FlowParticipation | undefined {
  if (typeof value === "string") return undefined;
  const owner = owners?.get(value.identity);
  return owner?.captures.has(value.identity) ? owner.handle : undefined;
}
export function participationGuard(
  explicit: unknown,
  contributions: readonly object[] | undefined,
  guard: (value: string | SemanticRecipe, path: string, parent: object | undefined) => void,
) {
  if (explicit !== undefined) checkParticipation(explicit);
  let installed = explicit === undefined ? undefined : canonicalParticipation(explicit as FlowParticipation);
  const selected = contributions?.flatMap((value) => {
    const owner = owners?.get(value);
    return owner ? [owner.handle] : [];
  });
  return {
    owner: () => installed,
    guard(value: string | SemanticRecipe, path: string, parent: object | undefined) {
      const marker = markerParticipation(value);
      if (marker) {
        if (installed && installed !== marker) fail("VDOM_HIERARCHY", path, "Conflicting Flow participation compilers");
        if (marker !== installed && !selected?.includes(marker))
          fail("MEASUREMENT_CONTEXT", path, "Marker requires its operation extension");
        installed = marker;
      }
      const role = installed ? participationRole(installed, value, parent) : { value, parent };
      guard(role.value, path, role.parent);
    },
  };
}
export function participationRole(
  owner: FlowParticipation,
  value: string | SemanticRecipe,
  parent: object | undefined,
) {
  checkParticipation(owner);
  const captures = owners!.get(owner)!.captures;
  return {
    value: typeof value !== "string" && captures.has(value.identity) ? { ...value, identity: blockIdentity } : value,
    parent: parent && captures.has(parent) ? blockIdentity : parent,
  };
}
export function checkParticipation(value: unknown): asserts value is FlowParticipation {
  if (!value || typeof value !== "object" || !owners?.has(value) || owners.get(value)!.captures.has(value))
    fail("TYPE", "/flow/participation", "Expected locally owned participation");
}
export function participationSources(
  nodes: readonly NormalizedContent[],
  operation: LayoutOperation,
  owner: FlowParticipation,
): readonly ParticipationSource[] {
  const captured = nodes.map((node) => {
    if (typeof node.value === "string") fail("TYPE", node.path, "Expected block source");
    const capture = owners!.get(owner)!.captures.get(node.value.identity);
    return capture ? (resolvedVisualSource(node.value, operation) ?? capture(node.value.props, node.path)) : undefined;
  });
  const ordinary = nodes.map((node, index) => {
    const capture = captured[index];
    if (!capture) return node;
    const children = Object.hasOwn(capture, "body")
      ? scopedContent(capture.body, operation, (input, path = `${node.path}/children`) =>
          operation.normalizeContent(input, dataRecipe, path, checkBlockChildRole),
        )
      : node.children;
    return { ...node, children, value: { identity: blockIdentity, props: { ...capture.props } } };
  });
  // Body-order contracts belong to conversion, after markers have ordinary Block props.
  const blocks = convertBlocks(ordinary, operation);
  return nodes.map((node, index) => {
    const block = blocks[index]!;
    const author = authorParagraph(block);
    return Object.freeze({
      block,
      ...(author ? { author } : {}),
      ...(captured[index] ? { data: captured[index].data } : {}),
      index,
      path: node.path,
      key: node.key ?? null,
    });
  });
}
export function compileParticipation(
  owner: FlowParticipation,
  sources: readonly ParticipationSource[],
  width: number,
  scope: CompilerScope,
): ParticipationResult {
  checkParticipation(owner);
  const preparedSources = new WeakMap<PreparedBlock, ParticipationSource>();
  return owners!.get(owner)!.compiler(sources, {
    ...scope,
    width,
    prepare: (source, allocated = width) => {
      if (!scope.lifetime.active) fail("MEASUREMENT_CONTEXT", source.path, "Expected active participation source");
      const block = compile([source.block], allocated, source.path, scope, true)[0]!;
      preparedSources.set(block, source);
      return block;
    },
    reference: (source, block) => {
      if (!scope.lifetime.active || preparedSources.get(block) !== source)
        fail("MEASUREMENT_CONTEXT", source.path, "Expected this source's active prepared Block");
      return hasVisualReference(block)
        ? readVisualReference(block, scope.operation, scope.lifetime)
        : Object.freeze({ x: 0, y: 0, ...block.naturalSize });
    },
  });
}
