import { type DocumentDefinition, DocumentError, renderUnknown, type RichTextNode } from "@updf/core";
import { type CmrData, cmrFixture, createCmrDocument, renderCMR } from "@updf/example-cmr/cmr";
import { render } from "./text-options.js";

/** Native TS templates are ordinary pure functions returning declarative data. */
export function createGreeting(data: { readonly recipient: string }): DocumentDefinition {
  return {
    version: 1,
    pages: [
      {
        width: 595,
        height: 842,
        children: [
          {
            type: "richText",
            x: 40,
            y: 40,
            width: 200,
            height: 24,
            paragraphs: [
              {
                runs: [{ text: `Hello ${data.recipient}` }],
                defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
                lineHeight: 12,
                align: "left",
                whiteSpace: "preserve",
                breakLongWords: "error",
              },
            ],
          },
        ],
      },
    ],
  } satisfies DocumentDefinition;
}

export const positiveBytes: Uint8Array = render(createGreeting({ recipient: "PDF" }));
export const cmrBytes: Uint8Array = renderCMR(createCmrDocument(cmrFixture satisfies CmrData));

// Compile-only tests: never execute deliberate invalid templates/mutations.
export function checkTypeErrors(document: DocumentDefinition, text: RichTextNode, data: CmrData, json: unknown): void {
  // @ts-expect-error Unsupported document version must fail compilation.
  render({ version: 2, pages: [] });
  // @ts-expect-error A misspelled node key is not part of the public schema.
  render({ version: 1, pages: [{ width: 100, height: 100, children: [{ ...text, fontSzie: 10 }] }] });
  // @ts-expect-error Image nodes are deliberately outside this versioned API.
  render({ version: 1, pages: [{ width: 100, height: 100, children: [{ type: "image", x: 0, y: 0 }] }] });
  render({
    version: 1,
    pages: [
      {
        width: 100,
        height: 100,
        // @ts-expect-error Canonical paragraph content is required.
        children: [{ type: "richText", x: 0, y: 0, width: 80, height: 20 }],
      },
    ],
  });
  // @ts-expect-error Alignment has a closed discriminated union inside paragraphs.
  const alignment: import("@updf/core").ParagraphDefinition = { ...text.paragraphs[0]!, align: "justify" };
  void alignment;
  // @ts-expect-error Readonly page arrays prohibit mutation through the typed API.
  document.pages.push({ width: 100, height: 100, children: [] });
  // @ts-expect-error Readonly node fields prohibit mutation through the typed API.
  text.paragraphs = [];
  // @ts-expect-error CMR display fields require strings, not implicit coercion.
  createCmrDocument({ ...data, totalWeight: 200 });
  // @ts-expect-error Each supplied goods row must use the named data shape.
  createCmrDocument({ ...data, goods: [{ unknownField: "x" }] });
  // @ts-expect-error CMR display inputs are readonly through their public type.
  data.sender = "changed";
  // @ts-expect-error JSON unknown cannot bypass the typed native rendering entry.
  render(json);
  // @ts-expect-error Unknown JSON cannot be assigned directly to a typed AST.
  const uncheckedDocument: DocumentDefinition = json;
  void uncheckedDocument;
  renderUnknown(json);
  // @ts-expect-error Diagnostic codes are a closed union, not arbitrary strings.
  new DocumentError("UNKNOWN_CODE", "", "example");
  const diagnostic = new DocumentError("TYPE", "", "example").diagnostics[0];
  if (diagnostic) {
    // @ts-expect-error Structured diagnostics are readonly to callers.
    diagnostic.code = "VALUE";
  }
}
