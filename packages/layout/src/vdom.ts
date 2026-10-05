import { contextLayoutOperation } from "@updf/core/internal";
import { documentComponent, FlowBody, FlowFooter, FlowHeader, FlowSection, Page } from "./document-data.js";
import { layoutDocument } from "./mixed-layout.js";
import { nativeDocument } from "./native-vdom.js";

/** JSX paginated section with Header/Body/Footer slots; uses core's JSX runtime. */
export const Flow = Object.freeze(
  Object.assign(FlowSection, { Header: FlowHeader, Body: FlowBody, Footer: FlowFooter }),
);
/** Exported as Document: lower ordered Page/Flow sections into a fixed core document. */
export const MixedDocument = documentComponent((props, context) =>
  nativeDocument(layoutDocument({ props }, contextLayoutOperation(context)).document),
);
export { Page };
