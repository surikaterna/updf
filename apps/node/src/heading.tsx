/** @jsxImportSource @updf/core */

import type { Component } from "@updf/core/vdom";
import { lower, render } from "./text-options.js";

const Heading: Component<{ readonly title: string }> = ({ title }) => (
  <richText
    x={0}
    y={0}
    width={200}
    height={24}
    paragraphs={[
      {
        runs: [{ text: title }],
        defaultStyle: { font: "Helvetica", fontSize: 10, color: [0, 0, 0] },
        lineHeight: 12,
        align: "left",
        whiteSpace: "preserve",
        breakLongWords: "error",
      },
    ]}
  />
);
const tree = (
  <document version={1}>
    <page width={595} height={842}>
      <group x={40} y={40}>
        <Heading title="Reusable native TSX" />
      </group>
    </page>
  </document>
);
export const bytes: Uint8Array = render(lower(tree));
