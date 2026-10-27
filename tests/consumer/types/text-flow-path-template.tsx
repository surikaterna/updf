/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { Document, Flow, Paragraph, layout } from "@updf/layout";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";
import { Path, pathShapes, type FloatingPathProps } from "@updf/text-flow/path";
import { Source } from "@updf/text-flow/sources";

const runtime = fontRuntime();
const FloatingPath = floatable(Path);
const shape = Source.path("m0 0h100l-80 96h-20z", { fillRule: "evenodd" });
const path: FloatingPathProps = { d: shape.d, fill: "#3498db", style: { width: 100, height: 96, float: "right" } };
const options = {
  text: createTextService({ runtime, defaultFont: "Helvetica" }),
  extensions: [textFlow({ handlers: [pathShapes()] })],
  resources: { Helvetica: createHelvetica() },
  providers: [fontProvider(runtime)],
};
const result = layout(
  <Document>
    <Flow pageSize={{ width: 220, height: 260 }} margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <FloatingPath key="path" {...path} />
      <Paragraph>{"Contour paragraph with full width continuation. ".repeat(40)}</Paragraph>
    </Flow>
  </Document>,
  options,
);
export const pdf = render(result.document, options);
if (result.pageCount < 2 || pdf.length < 500 || result.placements[0]?.sourceKeys?.[0] !== "path")
  throw new Error("Expected real multipage Path PDF and source provenance");
