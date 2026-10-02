import { type DocumentDefinition, render } from "@updf/core";
import type { PreparedFont } from "@updf/core/fonts";
import { h, lower } from "@updf/core/vdom";
import { prepareFont } from "@updf/fontkit";

export function prepare(bytes: Uint8Array<ArrayBuffer>): PreparedFont {
  return prepareFont(bytes);
}
export function use(font: PreparedFont, document: DocumentDefinition): Uint8Array {
  const resources = { Demo: font };
  lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: [] }) }), { resources });
  return render(document, { resources });
}
