import { contextLayoutOperation } from "@updf/core/internal";
import type { Component } from "@updf/core/vdom";
import { normalizeBlocks } from "./content-normalize.js";
import type { BlockComponent, BlockContent } from "./content-types.js";
import { documentComponent, FlowBody, FlowFooter, FlowHeader, FlowSection, Page } from "./document-data.js";
import type { DocumentProps } from "./document-types.js";
import type { Extensions } from "./extension-types.js";
import { layout } from "./layout.js";
import { layoutDocument } from "./mixed-layout.js";
import { nativeDocument } from "./native-vdom.js";
import type { FlowDocumentDefinition, PageTemplate } from "./types.js";

const Document: Component<FlowDocumentDefinition> = (definition, context) => {
  const result = layout(definition, contextLayoutOperation(context));
  return nativeDocument(result.document);
};
export const Flow = Object.assign(FlowSection, { Document, Header: FlowHeader, Body: FlowBody, Footer: FlowFooter });
Object.freeze(Flow);
const ContentDocument: BlockComponent<{
  readonly pageTemplate: PageTemplate;
  readonly children: BlockContent;
  readonly extensions?: Extensions;
}> = (props, context) => {
  const operation = contextLayoutOperation(context);
  const body = normalizeBlocks(props.children, operation, "/children");
  return nativeDocument(layout({ pageTemplate: props.pageTemplate, body }, operation, props.extensions).document);
};

export { Block, Paragraph, Span } from "./content-data.js";

const MixedDocument = documentComponent((props, context) =>
  nativeDocument(layoutDocument({ props }, contextLayoutOperation(context)).document),
);
const CompatibleDocument: BlockComponent<DocumentProps | Parameters<typeof ContentDocument>[0]> = (props, context) => {
  if ("pageTemplate" in props) return ContentDocument(props, context);
  return nativeDocument(layoutDocument({ props }, contextLayoutOperation(context)).document);
};

export { CompatibleDocument as Document, MixedDocument, Page };
