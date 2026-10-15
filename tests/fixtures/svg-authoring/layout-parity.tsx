/** @jsxImportSource @updf/svg */
import { render } from "@updf/core";
import { createOwnedResource, type TextRun } from "@updf/core/resources";
import { document, flow, layout, paragraph, pt } from "@updf/layout";
import { prepareSVG } from "@updf/svg";
import { prepareSVGTree } from "@updf/svg/authoring";
import { svgBlock, svgInline } from "@updf/svg/layout";
import { createTextService } from "@updf/text";

const text = createTextService({
  defaultFont: "Metrics",
  runtime: {
    validateResource() {},
    validateText() {},
    lineMetrics: () => ({ ascent: 0.01, descent: 0 }),
    measure(_resource, content) {
      if (content !== "") throw new Error("No text expected");
      return {
        advance: 0,
        left: 0,
        right: 0,
        ascent: 0.01,
        descent: 0,
        top: -0.01,
        bottom: 0,
        empty: true,
        run: Object.freeze({}) as TextRun,
      };
    },
    joinRuns() {
      return Object.freeze({}) as TextRun;
    },
  },
});
const options = { text, resources: { Metrics: createOwnedResource({}) } };
export function layoutParity(structured: boolean, refused: boolean) {
  const graphic = structured
    ? prepareSVGTree(
        <svg viewBox="0 0 1 1" preserveAspectRatio="none">
          <title>Native visual parity</title>
          <rect width={1} height={1} fill="red" />
        </svg>,
      )
    : prepareSVG(
        '<svg viewBox="0 0 1 1" preserveAspectRatio="none"><title>Native visual parity</title><rect width="1" height="1" fill="red"/></svg>',
      );
  const heights = refused ? [0.1, 0.2] : [1.2, 1.1];
  const height = refused ? 0.3 : 2.3;
  const result = layout(
    document({
      children: flow({
        pageSize: { width: 20, height },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: heights.map((height) => svgBlock(graphic, { width: 7, height })),
      }),
    }),
    options,
  );
  const inline = layout(
    document({
      children: flow({
        pageSize: { width: 20, height: 10 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: paragraph({ style: { lineHeight: pt(2) }, children: svgInline(graphic, { width: 7, height: 2 }) }),
      }),
    }),
    options,
  );
  return {
    document: result.document,
    pages: result.pageCount,
    pdf: render(result.document, options),
    inlineDocument: inline.document,
    inlinePDF: render(inline.document, options),
  };
}
