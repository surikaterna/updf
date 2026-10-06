import { type DocumentDefinition, render } from "@updf/core";
import type { OwnedResource } from "@updf/core/resources";
import { h, lower } from "@updf/core/vdom";
import { createPreparedFont, fontProvider, fontRuntime, type PreparedFont, type PreparedFontInput } from "@updf/fonts";
import { createTextService } from "@updf/text";

export function preparedConsumer(input: PreparedFontInput): Uint8Array {
  const font = createPreparedFont(input);
  const resources = { Demo: font } satisfies Readonly<Record<string, OwnedResource>>;
  const runtime = fontRuntime();
  const options = {
    resources,
    text: createTextService({ runtime, defaultFont: "Demo" }),
    providers: [fontProvider(runtime)],
  };
  const text = h("richText", {
    x: 10,
    y: 10,
    width: 200,
    height: 30,
    paragraphs: [
      {
        runs: [{ text: "Москва" }],
        defaultStyle: { font: "Demo", fontSize: 12, color: [0, 0, 0] },
        lineHeight: 16,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ],
  });
  const tree = h("document", { version: 1, children: h("page", { width: 595, height: 842, children: text }) });
  return render(lower(tree, options), options);
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
  // @ts-expect-error Paragraph font references are names, not raw font handles.
  const style: import("@updf/core").TextStyle = { font, fontSize: 10, color: [0, 0, 0] };
  // @ts-expect-error The old native text tag is not a rich-text alias.
  const node = h("text", { x: 0, y: 0, width: 100, height: 20, text: "X" });
  void style;
  void [bytes, fake, format, rights, node];
}
