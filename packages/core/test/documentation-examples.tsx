/** @jsxImportSource @updf/core */
/** @jsxRuntime automatic */
import { type DocumentDefinition, render } from "@updf/core";
import { createPreparedFont, type PreparedFontInput } from "@updf/fonts";
import { measureText } from "@updf/text";
import { lower } from "@updf/core/vdom";
import { textOptions } from "../../../tests/fixtures/text-options.js";

export const document: DocumentDefinition = {
  version: 1,
  pages: [
    {
      width: 200,
      height: 100,
      children: [
        {
          type: "text",
          x: 10,
          y: 10,
          width: 180,
          height: 40,
          text: "Hello PDF",
          fontSize: 12,
          lineHeight: 16,
          align: "left",
        },
      ],
    },
  ],
};

export const tree = (
  <document version={1}>
    <page width={200} height={100}>
      <text x={10} y={10} width={180} height={40} fontSize={12} lineHeight={16} align="left">
        Hello PDF
      </text>
    </page>
  </document>
);

export function prepareAndMeasure(input: PreparedFontInput) {
  const Demo = createPreparedFont(input);
  return measureText(
    { kind: "plain", text: "Hello", font: "Demo", width: 180, fontSize: 12, lineHeight: 16, align: "left" },
    textOptions({ resources: { Demo } }),
  );
}

export const renderTSX = () => {
  const options = textOptions({});
  return render(lower(tree, options), options);
};
