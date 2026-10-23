/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { Document, Flow, Paragraph, layout } from "@updf/layout";
import { createTextSelection } from "@updf/text/selection";
import { createPathTextFlow, type SideShape, type FloatingPathProps } from "@updf/text-flow/path";

const runtime = fontRuntime();
const composition = createTextSelection({ runtime, defaultFont: "Helvetica" });
const f = createPathTextFlow(composition.capability);
const shape: SideShape = { d: "m0 0h100l-80 96h-20z", fillRule: "evenodd" };
const path: FloatingPathProps = { d: shape.d, fill: "#3498db", style: { width: 100, height: 96, float: "right" } };
const options = { ...composition, resources: { Helvetica: createHelvetica() }, providers: [fontProvider(runtime)] };
const result = layout(
  <Document>
    <Flow
      pageSize={{ width: 220, height: 260 }}
      margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
      participation={f.participation}
    >
      <f.Path key="path" {...path} />
      <Paragraph>{"Contour paragraph with full width continuation. ".repeat(40)}</Paragraph>
    </Flow>
  </Document>,
  options,
);
export const pdf = render(result.document, options);
if (result.pageCount < 2 || pdf.length < 500 || result.placements[0]?.sourceKeys?.[0] !== "path")
  throw new Error("Expected real multipage Path PDF and source provenance");
