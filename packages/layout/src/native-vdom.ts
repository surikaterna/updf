import type { DocumentDefinition } from "@updf/core";
import { nativeNodeToVdom } from "@updf/core/internal-drawing";
import { h, type VNode } from "@updf/core/vdom";

export function nativeDocument(document: DocumentDefinition): VNode {
  return h("document", {
    version: 1,
    children: document.pages.map((page) =>
      h("page", {
        width: page.width,
        height: page.height,
        children: page.children.map(nativeNodeToVdom),
      }),
    ),
  });
}
