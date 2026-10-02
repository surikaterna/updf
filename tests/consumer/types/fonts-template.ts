import { type DocumentDefinition, render } from "@updf/core";
import { createPreparedFont, type FontResources, type PreparedFont, type PreparedFontInput } from "@updf/core/fonts";
import { h, lower } from "@updf/core/vdom";

export function preparedConsumer(input: PreparedFontInput): Uint8Array {
  const font = createPreparedFont(input);
  const resources = { Demo: font } satisfies FontResources;
  const text = h("text", {
    x: 10,
    y: 10,
    width: 200,
    height: 30,
    fontSize: 12,
    lineHeight: 16,
    align: "left",
    font: "Demo",
    text: "Москва",
  });
  const tree = h("document", { version: 1, children: h("page", { width: 595, height: 842, children: text }) });
  return render(lower(tree, { resources }), { resources });
}

export function negativeFonts(font: PreparedFont, input: PreparedFontInput, document: DocumentDefinition): void {
  // @ts-expect-error Opaque handles cannot expose mutable font program bytes.
  const bytes = font.bytes;
  // @ts-expect-error Construction requires the private brand, not merely a metadata shape.
  const fake: PreparedFont = { metadata: font.metadata };
  // @ts-expect-error Metadata and glyph arrays are readonly public views.
  font.metadata.glyphs.push({ codePoint: 65, glyphId: 1, advance: 500, bounds: [0, 0, 500, 700] });
  // @ts-expect-error Raw bytes are not resources; preparation is required first.
  render(document, { resources: { Demo: input.bytes } });
  // @ts-expect-error The prepared format is closed to static TrueType.
  const format = { ...input, format: "cff" } satisfies PreparedFontInput;
  // @ts-expect-error Restricted fonts cannot be typed as embeddable prepared inputs.
  const rights = { ...input, embeddingRights: "restricted" } satisfies PreparedFontInput;
  // @ts-expect-error Native font references are names, not raw font handles or numbers.
  const node = h("text", {
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    fontSize: 10,
    lineHeight: 12,
    align: "left",
    text: "X",
    font,
  });
  void [bytes, fake, format, rights, node];
}
