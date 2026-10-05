import {
  fail,
  isContentData,
  isVNode,
  ownContentData,
  validateDataObject as record,
  type SemanticRecipe,
  semanticComponent,
  snapshotData,
} from "@updf/core/internal";
import type {
  BlockComponent,
  ContentBlockProps,
  InlineComponent,
  ParagraphContent,
  ParagraphProps,
  SpanContent,
  SpanProps,
} from "./content-types.js";
import { isDecorationPlan } from "./decorations.js";
import { BlockBody, BlockFooter, BlockHeader } from "./deferred-decoration.js";
import { isExtensionBlock } from "./extensions.js";
import { columnIdentity, rowIdentity } from "./row-data.js";

export const paragraphIdentity = Object.freeze({});
export const spanIdentity = Object.freeze({});
export const blockIdentity = Object.freeze({});
export const visualIdentity = Object.freeze({});
export const legacyIdentity = Object.freeze({});
/** JSX flowing text block; ParagraphProps controls whitespace, wrapping and atomic placement. */
export const Paragraph = semanticComponent<Record<string, unknown>>(paragraphIdentity) as unknown as BlockComponent;
/** JSX inline text style layer; use only inside inline content. */
export const Span = semanticComponent<Record<string, unknown>>(spanIdentity) as unknown as InlineComponent;
const BlockRoot = semanticComponent<Record<string, unknown>>(
  blockIdentity,
) as unknown as BlockComponent<ContentBlockProps>;
/** JSX vertical box with Header/Body/Footer reservations; explicit hidden overflow clips, not redacts. */
export const Block = Object.freeze(
  Object.assign(BlockRoot, { Header: BlockHeader, Body: BlockBody, Footer: BlockFooter }),
);

export function contentSnapshot<T>(value: T, path: string): T {
  return snapshotData(
    value,
    path,
    (item) => isContentData(item) || isVNode(item) || isExtensionBlock(item) || isDecorationPlan(item),
  );
}
/** Frozen owned paragraph snapshot; caller data remains mutable, semantic validation occurs in measurement. */
export function paragraph(props: ParagraphProps): ParagraphContent {
  record(props, ["children", "style", "whiteSpace", "breakLongWords", "keepTogether"], "/paragraph");
  return ownContentData(contentSnapshot({ type: "contentParagraph" as const, props }, "/paragraph"));
}
/** Frozen owned inline style snapshot; serialized copies are not owned Span descriptors. */
export function span(props: SpanProps): SpanContent {
  record(props, ["children", "style"], "/span");
  return ownContentData(contentSnapshot({ type: "contentSpan" as const, props }, "/span"));
}
export function dataRecipe(value: object, path: string): SemanticRecipe {
  record(
    value,
    ["type", "props", "paragraph", "keepTogether", "height", "children", "style", "decorations", "width", "align"],
    path,
  );
  if (value.type === "contentParagraph" || value.type === "contentSpan" || value.type === "inlineVisual") {
    if (!isContentData(value)) fail("TYPE", path, "Expected an owned authoring descriptor");
    const identity =
      value.type === "contentParagraph"
        ? paragraphIdentity
        : value.type === "contentSpan"
          ? spanIdentity
          : visualIdentity;
    return {
      identity,
      props: value.type === "inlineVisual" ? { descriptor: value } : (value.props as Record<string, unknown>),
    };
  }
  if (value.type === "block") return { identity: blockIdentity, props: value };
  if (value.type === "row") return { identity: rowIdentity, props: value };
  if (value.type === "column") return { identity: columnIdentity, props: value };
  return { identity: legacyIdentity, props: { descriptor: value } };
}
