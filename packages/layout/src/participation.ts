import {
  fail,
  ownContentData,
  semanticComponent,
  type SemanticRecipe,
  type LayoutOperation,
  type NormalizedContent,
} from "@updf/core/internal";
import { compile, type CompilerScope } from "./block-compiler.js";
import { blockIdentity } from "./content-data.js";
import { authorParagraph, type AuthorParagraph, convertBlocks } from "./content-normalize.js";
import type { FlowBlock } from "./types.js";
import type { PreparedBlock } from "./protocol.js";
import type { BlockComponent, ContentBlockProps } from "./content-types.js";

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
}
export interface ParticipationResult {
  readonly blocks: readonly PreparedBlock[];
  readonly close: () => void;
}
type Compiler = (sources: readonly ParticipationSource[], context: ParticipationContext) => ParticipationResult;
interface Owner {
  readonly compiler: Compiler;
  marker?: {
    readonly identity: object;
    readonly capture: (
      props: Readonly<Record<string, unknown>>,
      path: string,
    ) => {
      readonly props: ContentBlockProps;
      readonly data: object;
    };
  };
}
let owners: WeakMap<object, Owner> | undefined;
export function defineParticipation(compiler: Compiler): FlowParticipation {
  const handle = ownContentData(Object.freeze({})) as unknown as FlowParticipation;
  owners ??= new WeakMap();
  owners.set(handle, { compiler });
  return handle;
}
export function participationComponent<P extends object>(
  owner: FlowParticipation,
  capture: (
    props: Readonly<Record<string, unknown>>,
    path: string,
  ) => { readonly props: ContentBlockProps; readonly data: object },
): BlockComponent<P> {
  checkParticipation(owner);
  const identity = Object.freeze({});
  owners!.get(owner)!.marker = { identity, capture };
  return semanticComponent<Record<string, unknown>>(identity) as unknown as BlockComponent<P>;
}
export function participationRole(
  owner: FlowParticipation,
  value: string | SemanticRecipe,
  parent: object | undefined,
) {
  checkParticipation(owner);
  const identity = owners!.get(owner)!.marker?.identity;
  return {
    value: typeof value !== "string" && value.identity === identity ? { ...value, identity: blockIdentity } : value,
    parent: parent === identity ? blockIdentity : parent,
  };
}
export function checkParticipation(value: unknown): asserts value is FlowParticipation {
  if (!value || typeof value !== "object" || !owners?.has(value))
    fail("TYPE", "/flow/participation", "Expected locally owned participation");
}
export function participationSources(
  nodes: readonly NormalizedContent[],
  operation: LayoutOperation,
  owner: FlowParticipation,
): readonly ParticipationSource[] {
  const captured = nodes.map((node) => {
    if (typeof node.value === "string") fail("TYPE", node.path, "Expected block source");
    const marker = owners!.get(owner)!.marker;
    return node.value.identity === marker?.identity ? marker.capture(node.value.props, node.path) : undefined;
  });
  const ordinary = nodes.map((node, index) => {
    const props = captured[index]?.props;
    return props ? { ...node, value: { identity: blockIdentity, props: { ...props } } } : node;
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
  return owners!.get(owner)!.compiler(sources, {
    ...scope,
    width,
    prepare: (source, allocated = width) => compile([source.block], allocated, source.path, scope, true)[0]!,
  });
}
