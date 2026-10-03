import { fail, isContentData, ownContentData, type SemanticRecipe, semanticComponent } from "@updf/core/internal";
import { contentSnapshot, dataRecipe } from "./content-data.js";
import type { BlockComponent } from "./content-types.js";
import { documentProps as validateDataObject } from "./document-props.js";
import type {
  BodyProps,
  DocumentContentData,
  DocumentProps,
  FlowContent,
  FlowProps,
  PageContent,
  PageProps,
  RegionContent,
  RegionProps,
} from "./document-types.js";

export const documentIdentity = Object.freeze({});
export const pageIdentity = Object.freeze({});
export const flowIdentity = Object.freeze({});
export const headerIdentity = Object.freeze({});
export const bodyIdentity = Object.freeze({});
export const footerIdentity = Object.freeze({});
export const Page = semanticComponent<Record<string, unknown>>(
  pageIdentity,
  true,
) as unknown as BlockComponent<PageProps>;
export const FlowSection = semanticComponent<Record<string, unknown>>(
  flowIdentity,
  true,
) as unknown as BlockComponent<FlowProps>;
export const FlowHeader = semanticComponent<Record<string, unknown>>(
  headerIdentity,
  true,
) as unknown as BlockComponent<RegionProps>;
export const FlowBody = semanticComponent<Record<string, unknown>>(
  bodyIdentity,
  true,
) as unknown as BlockComponent<BodyProps>;
export const FlowFooter = semanticComponent<Record<string, unknown>>(
  footerIdentity,
  true,
) as unknown as BlockComponent<RegionProps>;
export function documentComponent(resolve: BlockComponent<DocumentProps>): BlockComponent<DocumentProps> {
  return semanticComponent<Record<string, unknown>>(documentIdentity, true, (props, context) =>
    resolve(props as DocumentProps, context),
  ) as unknown as BlockComponent<DocumentProps>;
}
export function document(props: DocumentProps): DocumentContentData {
  validateDataObject(props, ["children"], "/document");
  return ownContentData(contentSnapshot({ type: "mixedDocument" as const, props }, "/document"));
}
export function page(props: PageProps): PageContent {
  validateDataObject(props, ["size", "orientation", "children"], "/page");
  return ownContentData(contentSnapshot({ type: "fixedPage" as const, props }, "/page"));
}
export function flow(props: FlowProps): FlowContent {
  validateDataObject(props, ["pageSize", "orientation", "margins", "children", "extensions"], "/flow");
  return ownContentData(contentSnapshot({ type: "flowSection" as const, props }, "/flow"));
}
export function flowHeader(props: RegionProps): RegionContent {
  return region("flowHeader", props);
}
export function flowFooter(props: RegionProps): RegionContent {
  return region("flowFooter", props);
}
export function flowBody(props: BodyProps): RegionContent {
  return region("flowBody", props);
}
function region(type: RegionContent["type"], props: RegionProps | BodyProps): RegionContent {
  validateDataObject(props, type === "flowBody" ? ["children"] : ["height", "children"], `/${type}`);
  return ownContentData(contentSnapshot({ type, props }, `/${type}`));
}
export function sectionRecipe(value: object, path: string): SemanticRecipe {
  const type = Object.getOwnPropertyDescriptor(value, "type")?.value;
  const identities: Readonly<Record<string, object>> = {
    mixedDocument: documentIdentity,
    fixedPage: pageIdentity,
    flowSection: flowIdentity,
    flowHeader: headerIdentity,
    flowBody: bodyIdentity,
    flowFooter: footerIdentity,
  };
  const identity = typeof type === "string" ? identities[type] : undefined;
  if (!identity) return dataRecipe(value, path);
  validateDataObject(value, ["type", "props"], path);
  if (!isContentData(value)) fail("TYPE", path, "Expected owned document descriptor");
  return { identity, props: value.props as Readonly<Record<string, unknown>>, opaque: true };
}
