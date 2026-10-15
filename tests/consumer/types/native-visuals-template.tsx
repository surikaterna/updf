/** @jsxImportSource @updf/core */
import {
  Document,
  Flow,
  Paragraph,
  Span,
  fixed,
  nativeInline,
  paragraph,
  type FixedInput,
  type FixedBlock,
  type NativeInlineInput,
  type InlineVisual,
} from "@updf/layout";
import { layout, measure } from "./layout-options.js";
import { render } from "./text-options.js";

const fixedInput: FixedInput = { width: 8, height: 4, children: [] };
const nativeInput: NativeInlineInput = { advance: 8, ascent: 4, nodes: [] };
const block: FixedBlock = fixed(fixedInput);
const visual: InlineVisual = nativeInline(nativeInput);
const result = layout(
  <Document>
    <Flow pageSize={{ width: 40, height: 40 }} margins={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      {block}
      <Paragraph>
        <Span>{visual}</Span>
      </Paragraph>
    </Flow>
  </Document>,
);
if (result.placements[0]?.box.width !== 8 || render(result.document).length === 0) throw Error("native fixed JSX");
if (measure(paragraph({ children: visual }), { width: 20 }).lines[0]?.advance !== 8) throw Error("native inline data");
if (result.pageCount < 0) {
  // @ts-expect-error Present undefined is not an omitted width.
  fixed({ ...fixedInput, width: undefined });
  // @ts-expect-error Present undefined is not an omitted descent.
  nativeInline({ ...nativeInput, descent: undefined });
  // @ts-expect-error Native input has no caller-trusted ink bounds.
  nativeInline({ ...nativeInput, inkBounds: { empty: true } });
  // @ts-expect-error Native metrics are point-valued numbers.
  nativeInline({ ...nativeInput, advance: "8" });
  // @ts-expect-error Fixed nodes are readonly.
  block.children.push({});
}
