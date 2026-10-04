/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import {
  Document,
  Flow,
  type LineHeight,
  layout,
  measure,
  Paragraph,
  type ParagraphStyle,
  type PointLength,
  paragraph,
  pt,
  Span,
  type SpanStyle,
} from "@updf/layout";

const absolute: PointLength = pt(16);
const ratio: LineHeight = 1.2;
const body: ParagraphStyle = {
  font: "Helvetica",
  fontSize: 12,
  lineHeight: ratio,
  color: [0, 0, 0],
  textAlign: "left",
};
const emphasis: SpanStyle = { fontSize: 20, lineHeight: absolute };
const content = (
  <Paragraph style={body}>
    <Span style={emphasis}>Packed style</Span>
  </Paragraph>
);
const measured = measure(content, { width: 200 });
const tree = (
  <Document>
    <Flow pageSize={{ width: 240, height: 100 }} margins={{ top: 20, right: 20, bottom: 20, left: 20 }}>
      {content}
    </Flow>
  </Document>
);
if (!render(layout(tree).document).length || measured.lines[0]!.height <= 0) throw new Error("Style consumer runtime");
if (measured.size.height < 0) {
  // @ts-expect-error Point lengths are readonly.
  absolute.value = 20;
  // @ts-expect-error Obsolete paragraph prop, not a compatibility alias.
  paragraph({ defaultStyle: { fontSize: 12 } });
  // @ts-expect-error Numeric point-valued paragraph prop is retired.
  paragraph({ lineHeight: 16 });
  // @ts-expect-error Alignment belongs to style.textAlign.
  paragraph({ align: "left" });
  // @ts-expect-error Font is a resource ID, not a family.
  const family: SpanStyle = { fontFamily: "Helvetica" };
  // @ts-expect-error Span cannot align the paragraph.
  const aligned: SpanStyle = { textAlign: "right" };
  // @ts-expect-error Unsupported CSS units.
  const pixels: LineHeight = { unit: "px", value: 16 };
  // @ts-expect-error Present undefined is not supported.
  const undefinedStyle: ParagraphStyle = { lineHeight: undefined };
  void [family, aligned, pixels, undefinedStyle];
}
