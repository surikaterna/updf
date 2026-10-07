/** @jsxImportSource @updf/core */
import { render } from "@updf/core";
import { lower } from "@updf/core/vdom";
import { createOwnedResource, type TextRun } from "@updf/core/resources";
import { Block, createExtensions, Document, Flow, Paragraph } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { svgAdapters, svgBlock, svgInline, type SvgSize } from "@updf/svg/layout";
import { Table, tableExtension } from "@updf/tables";
import { createTextService } from "@updf/text";
import { graphic } from "./svg-graphic-template.js";

const xml = prepareSVG('<svg viewBox="0 0 20 10"><rect x="2" y="3" width="5" height="4" fill="red"/></svg>');
const size: SvgSize = { width: 40 };
const extensions = createExtensions([...svgAdapters, tableExtension]);
export const document = (
  <Document>
    <Flow
      pageSize={{ width: 150, height: 150 }}
      margins={{ top: 5, right: 5, bottom: 5, left: 5 }}
      extensions={extensions}
    >
      <Block style={{ padding: 2 }}>{svgBlock(graphic, size)}</Block>
      <Paragraph>{svgInline(xml, { height: 10 })}</Paragraph>
      <Table columns={[{ width: 100 }]} style={{ padding: 2 }}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              {svgBlock(xml, { width: 30 })}
              <Paragraph>{svgInline(graphic, { width: 20 })}</Paragraph>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </Flow>
  </Document>
);
// Inline-only paragraphs still need explicit line metrics, not a font package/provider.
const text = createTextService({
  defaultFont: "Metrics",
  runtime: {
    validateResource() {},
    validateText() {},
    lineMetrics: () => ({ ascent: 8, descent: 2 }),
    measure(_resource, content) {
      if (content !== "") throw new Error("This fixture paints no text");
      return {
        advance: 0,
        left: 0,
        right: 0,
        ascent: 8,
        descent: 2,
        top: -8,
        bottom: 2,
        empty: true,
        run: Object.freeze({}) as TextRun,
      };
    },
    joinRuns() {
      return Object.freeze({}) as TextRun;
    },
  },
});
export const bytes = render(lower(document, { text, resources: { Metrics: createOwnedResource({ metrics: true }) } }));
if (bytes.length < 100) throw new Error("SVG layout output");
export function failures(): void {
  // @ts-expect-error Prepared SVG handles are required, not markup strings.
  svgBlock("<svg/>", {});
  // @ts-expect-error Size is point-valued, not CSS lengths.
  svgInline(graphic, { width: "20px" });
  // @ts-expect-error No generic role or style prop on the SVG helper.
  svgBlock(graphic, { width: 10, role: "inline" });
  // @ts-expect-error Optional fields must be omitted rather than undefined.
  svgInline(graphic, { width: undefined });
}
