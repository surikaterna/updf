/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { Document, Flow, Paragraph, Span, Block, layout } from "@updf/layout";
import { createTextService } from "@updf/text";
import { floatable, textFlow } from "@updf/text-flow";
import { render as renderAuthored } from "@updf/layout/render";
import { defineVisual } from "@updf/layout/internal-visual";
import type { BlockStyle } from "@updf/layout";

interface BadgeProps {
  readonly label: "badge";
  readonly style?: BlockStyle;
}
const badge = defineVisual<BadgeProps, string>({
  name: "consumer.badge",
  capture: (input) => ({ props: { style: input.style as BlockStyle }, visual: String(input.label) }),
  measure: (_label, context) => ({
    fragmentation: "atomic",
    extent: 1,
    naturalSize: { width: context.width, height: 4 },
    next: () => ({ end: 1, height: 4, nodes: [] }),
  }),
});
const FloatingBadge = floatable(badge.Component);
export const typedBadge = <FloatingBadge label="badge" style={{ width: 30, height: 20, float: "left" }} />;
// @ts-expect-error Generic visual props retain their required literal field.
export const wrongBadge = <FloatingBadge label="wrong" style={{ width: 30, height: 20, float: "left" }} />;
// @ts-expect-error Floating styles remain mandatory.
export const missingStyle = <FloatingBadge label="badge" />;
// @ts-expect-error A visual's fields do not admit arbitrary additions.
export const extraBadge = <FloatingBadge label="badge" extra={1} style={{ width: 30, height: 20, float: "left" }} />;

const runtime = fontRuntime();
const text = createTextService({ runtime, defaultFont: "Helvetica" });
const FloatingBlock = floatable(Block);
const options = {
  text,
  extensions: [textFlow()],
  resources: { Helvetica: createHelvetica() },
  providers: [fontProvider(runtime)],
};
const content = (
  <Document>
    <Flow pageSize={{ width: 220, height: 260 }} margins={{ top: 10, right: 10, bottom: 10, left: 10 }}>
      <FloatingBlock key="visual" style={{ width: 72, height: 96, float: "right", backgroundColor: [0.2, 0.4, 0.6] }} />
      <Paragraph>
        Rich <Span style={{ color: [1, 0, 0] }}>styled</Span> first paragraph.
      </Paragraph>
      <Paragraph>{"Second paragraph at full width below. ".repeat(40)}</Paragraph>
    </Flow>
  </Document>
);
const result = layout(content, options);
export const pdf = render(result.document, options);
const authored: Uint8Array<ArrayBuffer> = renderAuthored(content, options);
if (authored.length !== pdf.length) throw new Error("Authored rendering must match explicit stages");
if (result.pageCount < 2 || pdf.length < 500) throw new Error("Expected real multipage sibling PDF");
