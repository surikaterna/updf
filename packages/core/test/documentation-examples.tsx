/** @jsxImportSource @updf/core */
/** @jsxRuntime automatic */
import { type DocumentDefinition, type ParagraphDefinition, render } from "@updf/core";
import { createPreparedFont, type PreparedFontInput } from "@updf/fonts";
import { measureText } from "@updf/text";
import { lower } from "@updf/core/vdom";
import { measurementOptions, textOptions } from "../../../tests/fixtures/text-options.js";

const paragraphs: readonly ParagraphDefinition[] = [
  {
    runs: [{ text: "Hello PDF" }],
    defaultStyle: { font: "Helvetica", fontSize: 12, color: [0, 0, 0] },
    lineHeight: 16,
    align: "left",
    whiteSpace: "preserve",
    breakLongWords: "error",
  },
];

export const document: DocumentDefinition = {
  version: 1,
  pages: [
    {
      width: 200,
      height: 100,
      children: [
        {
          type: "richText",
          x: 10,
          y: 10,
          width: 180,
          height: 40,
          paragraphs,
        },
      ],
    },
  ],
};

export const tree = (
  <document version={1}>
    <page width={200} height={100}>
      <richText x={10} y={10} width={180} height={40} paragraphs={paragraphs} />
    </page>
  </document>
);

export function prepareAndMeasure(input: PreparedFontInput) {
  const Demo = createPreparedFont(input);
  return measureText(
    {
      width: 180,
      paragraphs: [
        {
          runs: [{ text: "Hello" }],
          defaultStyle: { font: "Demo", fontSize: 12, color: [0, 0, 0] },
          lineHeight: 16,
          align: "left",
          whiteSpace: "preserve",
          breakLongWords: "error",
        },
      ],
    },
    measurementOptions({ resources: { Demo } }),
  );
}

export const renderTSX = () => {
  const options = textOptions({});
  return render(lower(tree, options), options);
};
