/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { Fragment } from "@updf/core/jsx-runtime";
import { createContext } from "@updf/core/vdom";
import {
  Column,
  type ColumnProps,
  column,
  Document,
  Flow,
  layout,
  measure,
  Paragraph,
  paragraph,
  Row,
  type RowProps,
  row,
  type WidthTrack,
} from "@updf/layout";

const Theme = createContext("blue");
const track: WidthTrack = { weight: 2, min: 20, max: 80 };
const props: ColumnProps = { width: track, children: <Paragraph>RIGHT</Paragraph> };
const rowProps: RowProps = { align: "bottom", style: { gap: 4 }, children: <Column {...props} /> };
function Wrapped() {
  return (
    <Fragment>
      <Column width={40}>
        <Paragraph>LEFT</Paragraph>
      </Column>
    </Fragment>
  );
}
const content = (
  <Row align="bottom" style={{ gap: 4 }}>
    <Theme.Provider value="green">
      <Wrapped />
      <Column {...props} />
    </Theme.Provider>
  </Row>
);
const data = row({
  align: "bottom",
  style: { gap: 4 },
  children: [
    column({ width: 40, children: [paragraph({ children: "LEFT" })] }),
    column({ width: track, children: [paragraph({ children: "RIGHT" })] }),
  ],
});
if (JSON.stringify(measure(content, { width: 124 }).size) !== JSON.stringify(measure(data, { width: 124 }).size))
  throw new Error("Row geometry parity");
if (
  !render(
    layout(
      <Document>
        <Flow pageSize={{ width: 124, height: 100 }} margins={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {content}
        </Flow>
      </Document>,
    ).document,
  ).length
)
  throw new Error("Row public runtime");
if (measure(content, { width: 124 }).size.height < 0) {
  const invalidKeep = (
    // @ts-expect-error Row is always atomic, not an optionally fragmentable Block.
    <Row keepTogether={false}>
      <Column {...props} />
    </Row>
  );
  const invalidOverflow = (
    // @ts-expect-error Row cannot implicitly clip.
    <Row style={{ overflow: "hidden" }}>
      <Column {...props} />
    </Row>
  );
  // @ts-expect-error Column track is not a CSS width.
  const invalidTrack = <Column width="50%" children={props.children} />;
  // @ts-expect-error Column style cannot override track widths.
  const invalidStyle = <Column style={{ minWidth: 20 }} {...props} />;
  // @ts-expect-error Column style cannot override track widths.
  const invalidWidth = <Column style={{ width: 20 }} {...props} />;
  // @ts-expect-error Column style cannot override track widths.
  const invalidMax = <Column style={{ maxWidth: 20 }} {...props} />;
  // @ts-expect-error Columns cannot contain bare block text.
  const invalidText = <Column>text</Column>;
  // @ts-expect-error Props are readonly.
  rowProps.align = "top";
  // @ts-expect-error Track constraints are readonly.
  track.min = 10;
  void [invalidKeep, invalidOverflow, invalidTrack, invalidStyle, invalidWidth, invalidMax, invalidText];
}
