/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontProvider, fontRuntime } from "@updf/fonts";
import { Document, Flow, layout, Paragraph, Span, pt } from "@updf/layout";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";
import { Path, pathShapes } from "@updf/text-flow/path";
const FloatingPath = floatable(Path);

export function pathExample(title: string) {
  const runtime = fontRuntime();
  const options = {
    text: createTextService({ runtime, defaultFont: "Helvetica" }),
    extensions: [textFlow({ handlers: [pathShapes()] })],
    resources: { Helvetica: createHelvetica() },
    providers: [fontProvider(runtime)],
  };
  const result = layout(
    <Document>
      <Flow pageSize={{ width: 480, height: 520 }} margins={{ top: 28, right: 28, bottom: 28, left: 28 }}>
        <Paragraph style={{ fontSize: 18, lineHeight: pt(24) }}>{title}</Paragraph>
        <FloatingPath
          d="M0 0 H160 L70 48 L140 90 L45 138 L100 180 H0 Z"
          fill="#3498db"
          fillRule="nonzero"
          style={{ width: 160, height: 180, float: "left" }}
        />
        <Paragraph style={{ fontSize: 12, lineHeight: pt(17) }}>
          A real filled Path. <Span style={{ color: [0.1, 0.35, 0.6] }}>One authored geometry paints and wraps.</Span>{" "}
          Ordinary Paragraph siblings follow the zigzag side, rather than a bounding rectangle.
        </Paragraph>
        <Paragraph style={{ fontSize: 12, lineHeight: pt(17) }}>
          {"The blue side contour changes the available line width. Below the path, ordinary text returns to full width. ".repeat(
            8,
          )}
        </Paragraph>
        <Paragraph style={{ fontSize: 10, lineHeight: pt(14) }}>
          Straight closed paths, outer-side only; holes not used for text. Center wrapping and text inside holes remain
          pending. No shape margin or transparency extraction is used.
        </Paragraph>
      </Flow>
    </Document>,
    options,
  );
  return { bytes: render(result.document, options), pageCount: result.pageCount };
}
