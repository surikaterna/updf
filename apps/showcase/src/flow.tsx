/** @jsxImportSource @updf/core */

import { useContext } from "@updf/core/vdom";
import { Block, Document, Flow, PageContext, PageSize, Paragraph, pageSize, pt } from "@updf/layout";
import { layout } from "./layout-options.js";
import { render } from "./text-options.js";

export interface FlowControls {
  readonly count: number;
  readonly preset: "compact" | "letter" | "overflow";
  readonly regions: boolean;
  readonly keepTogether: boolean;
}
export const flowDefaults: FlowControls = { count: 6, preset: "compact", regions: true, keepTogether: false };
function ReportFooter() {
  const page = useContext(PageContext);
  return (
    <Block style={{ paddingTop: 8 }}>
      <Paragraph style={{ fontSize: 10, lineHeight: pt(16) }}>
        {`Repeated footer ${page.docPageNumber}/${page.docPageCount}`}
      </Paragraph>
    </Block>
  );
}
export function flowDefinition(title: string, controls: FlowControls = flowDefaults) {
  if (!Number.isInteger(controls.count) || controls.count < 1 || controls.count > 21)
    throw new Error("Paragraph count must be 1–21 (bounded showcase control, not a core limit)");
  if (!["compact", "letter", "overflow"].includes(controls.preset)) throw new Error("Unknown page preset");
  const size =
    controls.preset === "letter" ? PageSize.Letter : pageSize(240, controls.preset === "overflow" ? 100 : 240);
  return (
    <Document>
      <Flow pageSize={size} margins={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        {controls.regions && (
          <Flow.Header height={24}>
            <Paragraph style={{ fontSize: 10, lineHeight: pt(16) }}>UPDF flow header</Paragraph>
          </Flow.Header>
        )}
        <Flow.Body>
          {Array.from({ length: controls.count }, (_, i) => (
            <Paragraph
              style={{ fontSize: 12, lineHeight: pt(16) }}
              whiteSpace="preserve"
              breakLongWords="codePoint"
              keepTogether={controls.keepTogether || controls.preset === "overflow"}
            >
              {`${i + 1}. ${title}\nComplete measured lines.\nExplicit page template.\nNo clipping or shrinking.\nPortable PDF bytes.`}
            </Paragraph>
          ))}
        </Flow.Body>
        {controls.regions && (
          <Flow.Footer height={24}>
            <ReportFooter />
          </Flow.Footer>
        )}
      </Flow>
    </Document>
  );
}
export function flowExample(title: string, controls: FlowControls = flowDefaults) {
  const result = layout(flowDefinition(title, controls));
  return { bytes: render(result.document), result, authoredParagraphCount: controls.count };
}
