/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { createHelvetica, fontRuntime, fontProvider } from "@updf/fonts";
import { Document, Flow, Paragraph, Span, layout } from "@updf/layout";
import { createTextSelection } from "@updf/text/selection";
import { createTextFlow } from "@updf/text-flow";

const runtime = fontRuntime();
const composition = createTextSelection({ runtime, defaultFont: "Helvetica" });
const f = createTextFlow(composition.capability);
const options = { ...composition, resources: { Helvetica: createHelvetica() }, providers: [fontProvider(runtime)] };
const result = layout(
  <Document>
    <Flow
      pageSize={{ width: 220, height: 260 }}
      margins={{ top: 10, right: 10, bottom: 10, left: 10 }}
      participation={f.participation}
    >
      <f.Block key="visual" style={{ width: 72, height: 96, float: "right", backgroundColor: [0.2, 0.4, 0.6] }} />
      <Paragraph>
        Rich <Span style={{ color: [1, 0, 0] }}>styled</Span> first paragraph.
      </Paragraph>
      <Paragraph>{"Second paragraph at full width below. ".repeat(40)}</Paragraph>
    </Flow>
  </Document>,
  options,
);
export const pdf = render(result.document, options);
if (result.pageCount < 2 || pdf.length < 500) throw new Error("Expected real multipage sibling PDF");
