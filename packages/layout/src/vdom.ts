import { contextLayoutOperation } from "@updf/core/internal";
import { documentComponent, FlowBody, FlowFooter, FlowHeader, FlowSection, Page } from "./document-data.js";
import { layoutDocument } from "./mixed-layout.js";
import { nativeDocument } from "./native-vdom.js";

export const Flow = Object.freeze(
  Object.assign(FlowSection, { Header: FlowHeader, Body: FlowBody, Footer: FlowFooter }),
);
export const MixedDocument = documentComponent((props, context) =>
  nativeDocument(layoutDocument({ props }, contextLayoutOperation(context)).document),
);
export { Page };
