import { type DocumentDefinition, render } from "@updf/core";
import { h, lower } from "@updf/core/vdom";
import { prepareFont } from "@updf/fontkit";
import { fontProvider, fontRuntime, type PreparedFont } from "@updf/fonts";
import { createTextService } from "@updf/text";

export function prepare(bytes: Uint8Array<ArrayBuffer>): PreparedFont {
  return prepareFont(bytes);
}
export function use(font: PreparedFont, document: DocumentDefinition): Uint8Array {
  const resources = { Demo: font };
  const runtime = fontRuntime();
  const options = {
    resources,
    text: createTextService({ runtime, defaultFont: "Demo" }),
    providers: [fontProvider(runtime)],
  };
  lower(h("document", { version: 1, children: h("page", { width: 100, height: 100, children: [] }) }), options);
  return render(document, options);
}
