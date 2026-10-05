/** @jsxImportSource @updf/core */

import {
  Block,
  type BlockStyle,
  type BorderEdge,
  type BorderPolicy,
  Document,
  Flow,
  type LineHeight,
  mergeBorders,
  Paragraph,
  type ParagraphStyle,
  type PointLength,
  paragraph,
  pt,
  Span,
  type SpanStyle,
} from "@updf/layout";
import { layout, measure } from "./layout-options.js";
import { render } from "./text-options.js";

const absolute: PointLength = pt(16);
const ratio: LineHeight = 1.2;
const body: ParagraphStyle = {
  font: "Helvetica",
  fontSize: 12,
  lineHeight: ratio,
  color: [0, 0, 0],
  textAlign: "left",
};
const emphasis: SpanStyle = { fontSize: 20, lineHeight: absolute, backgroundColor: [1, 1, 0] };
const rule: BorderEdge = { width: 2, color: [0, 0, 1] };
const heading: BorderPolicy = { borderBottom: rule, borderTop: null };
const box: BlockStyle = {
  backgroundColor: [0.9, 0.96, 1],
  padding: 4,
  paddingLeft: 8,
  border: { width: 1, color: [0, 0, 0] },
  ...mergeBorders([{ style: heading, path: "/theme/heading" }]),
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
  // @ts-expect-error Paragraph backgrounds belong on an explicit Block wrapper.
  const highlighted: ParagraphStyle = { backgroundColor: [1, 1, 0] };
  // @ts-expect-error Span highlights require an RGB triple, not a CSS color string.
  const cssHighlight: SpanStyle = { backgroundColor: "yellow" };
  // @ts-expect-error Omit optional highlight colors instead of setting undefined.
  const undefinedHighlight: SpanStyle = { backgroundColor: undefined };
  // @ts-expect-error The canonical property has no background alias on Spans.
  const obsoleteHighlight: SpanStyle = { background: [1, 1, 0] };
  void [cssHighlight, undefinedHighlight, obsoleteHighlight];
  // @ts-expect-error Border edges require a color.
  const bordered: BlockStyle = { borderLeft: { width: 1 } };
  // @ts-expect-error Omit an edge instead of setting undefined.
  const undefinedBorder: BorderPolicy = { borderTop: undefined };
  void undefinedBorder;
  void [obsoleteBox, insetBox, highlighted, bordered];
}
