/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import type { ParagraphDefinition } from "@updf/core/resources";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { createTextComposition } from "@updf/text/composition";
import { Document, Flow, createExtensions, layout } from "@updf/layout";
import { createAtomicTextFlow } from "@updf/text-flow/atomic";

const paragraphs: readonly ParagraphDefinition[] = [
  {
    runs: [{ text: "Selected once" }],
    defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
    lineHeight: 16,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  },
];
const runtime = fontRuntime();
const composition = createTextComposition({ runtime });
const { TextFlow, textFlowAdapter } = createAtomicTextFlow(composition.capability);
const options = {
  resources: { Helvetica: createHelvetica() },
  ...composition,
  providers: [fontProvider(runtime)],
};
const result = layout(
  <Document>
    <Flow
      pageSize={{ width: 300, height: 200 }}
      margins={{ top: 0, right: 0, bottom: 0, left: 0 }}
      extensions={createExtensions([textFlowAdapter])}
    >
      <TextFlow paragraphs={paragraphs} style={{ width: 240, maxHeight: 160 }} />
    </Flow>
  </Document>,
  options,
);
if (result.pageCount !== 1 || !render(result.document, options).length) throw new Error("composition consumer");
if (!paragraphs.length) {
  // @ts-expect-error Numeric points only, not CSS strings.
  void (<TextFlow paragraphs={paragraphs} style={{ width: "240px", maxHeight: 160 }} />);
  // @ts-expect-error Arbitrary children are not parsed in the rectangular slice.
  void (<TextFlow paragraphs={paragraphs} style={{ maxHeight: 160 }} children="not parsed" />);
  // @ts-expect-error maxHeight is a required finite ceiling.
  void (<TextFlow paragraphs={paragraphs} style={{ width: 240 }} />);
}
