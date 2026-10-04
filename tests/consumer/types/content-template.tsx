/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import {
  Block,
  createExtensions,
  Document,
  defineBlockAdapter,
  defineInlineAdapter,
  document,
  extension,
  Flow,
  flow,
  type InlineContent,
  inline,
  layout,
  type MeasuredContent,
  measure,
  Paragraph,
  paragraph,
  Span,
  span,
} from "@updf/layout";

const adapter = defineInlineAdapter<{ height: number }>({
  name: "consumer.visual",
  validate: (input) => input as { height: number },
  measure: ({ height }) => ({
    advance: height,
    ascent: height,
    descent: 0,
    inkBounds: { empty: false, left: 0, top: -height, right: height, bottom: 0 },
    nodes: [{ type: "rect", x: 0, y: 0, width: height, height, paint: { stroke: null, fill: [0, 1, 0] } }],
  }),
});
const extensions = createExtensions([adapter]);
const content = (
  <Block>
    <Paragraph style={{ fontSize: 10 }}>
      {"author text "}
      <Span style={{ color: [1, 0, 0] }}>
        {"styled"}
        <Span style={{ fontSize: 12 }}> nested</Span>
      </Span>
      {inline(adapter, { height: 16 })}
    </Paragraph>
  </Block>
);
const measured = measure(content, { width: 200 }, { extensions });
const result = render(
  lower(
    <Document>
      <Flow
        extensions={extensions}
        pageSize={{ width: 220, height: 100 }}
        margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        {content}
      </Flow>
    </Document>,
  ),
);
if (measured.lines.length !== 1 || result.length === 0) throw new Error("semantic TSX");
const data = paragraph({ children: ["data ", span({ children: "span" })] });
if (measure(data, { width: 100 }).size.height !== 10) throw new Error("data defaults");
const owner = defineBlockAdapter({
  name: "consumer.content-owner",
  validate: (input) => input,
  measure(_props, context) {
    const result: MeasuredContent = context.measureContent(data, { width: context.width });
    if (result.size.height < 0) {
      // @ts-expect-error Native measurement output is readonly.
      result.nodes.push({});
      // @ts-expect-error Measurement constraints have a mandatory numeric width.
      context.measureContent(data, { width: "100" });
      // @ts-expect-error Bare text is not block content.
      context.measureContent("text", { width: 100 });
    }
    return {
      fragmentation: "atomic",
      extent: 1,
      naturalSize: result.size,
      fragment: () => ({ status: "placed", nextOffset: 1, height: result.size.height, nodes: result.nodes }),
    };
  },
});
const ownedResult = layout(
  document({
    children: flow({
      pageSize: { width: 100, height: 40 },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      children: [extension(owner, {})],
      extensions: createExtensions([owner]),
    }),
  }),
);
if (!render(ownedResult.document).length) throw new Error("operation-bound content measurement");
// @ts-expect-error Numeric children are not coerced.
const numeric: InlineContent = 10;
void numeric;
// @ts-expect-error Block data is not inline data.
const invalid: InlineContent = data;
void invalid;
// @ts-expect-error Span cannot configure paragraph alignment.
const invalidProps = <Span align="center">text</Span>;
void invalidProps;
if (measured.size.height < 0) {
  // @ts-expect-error Measurements are deeply readonly.
  measured.size.height = 1;
  // @ts-expect-error Inline adapter props remain meaningful.
  inline(adapter, { height: "16" });
}
