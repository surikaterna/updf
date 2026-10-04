/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import {
  Block,
  type BlockStyle,
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
const box: BlockStyle = {
  backgroundColor: [0.9, 0.96, 1],
  padding: 4,
  paddingLeft: 8,
  border: { width: 1, color: [0, 0, 0] },
};
const content = (
  <Block style={box}>
    <Paragraph style={body}>
      <Span style={emphasis}>Packed style</Span>
    </Paragraph>
  </Block>
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
  // @ts-expect-error Background is not an alias.
  const obsoleteBox: BlockStyle = { background: [1, 1, 0] };
  // @ts-expect-error Scalar-only padding shorthand.
  const insetBox: BlockStyle = { padding: { top: 1, right: 1, bottom: 1, left: 1 } };
  // @ts-expect-error Span backgrounds are planned separately in #43.
  const highlighted: SpanStyle = { backgroundColor: [1, 1, 0] };
  // @ts-expect-error Per-edge borders are planned separately in #42.
  const bordered: BlockStyle = { borderLeft: { width: 1, color: [0, 0, 0] } };
  void [obsoleteBox, insetBox, highlighted, bordered];
}
