import assert from "node:assert/strict";
import test from "node:test";
import { type DocumentDefinition, DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { lower, measureText, render, renderUnknown } from "../../../tests/fixtures/text-options.js";
import {
  LegacyFlow as Flow,
  type FlowDocumentDefinition,
  layoutFlow,
  layoutFlowUnknown,
} from "../../../tests/fixtures/transitional-layout.js";
import { bits, value } from "../dist/binary64.js";
import { fixed, flow, paragraph } from "./fixtures.js";

function agrees(input: FlowDocumentDefinition, pageCount = 1): DocumentDefinition {
  const result = layoutFlow(input);
  assert.equal(result.pageCount, pageCount);
  assert.deepEqual(layoutFlowUnknown(input), result);
  assert.deepEqual(renderUnknown(result.document), render(result.document));
  assert.deepEqual(render(lower(h(Flow.Document, input))), render(result.document));
  return result.document;
}
function rejects(input: FlowDocumentDefinition, code: string, path: string): void {
  for (const [prefix, run] of [
    ["", () => layoutFlow(input)],
    ["", () => layoutFlowUnknown(input)],
    ["/tree", () => lower(h(Flow.Document, input))],
  ] as const) {
    assert.throws(
      run,
      (error: unknown) =>
        error instanceof DocumentError &&
        error.diagnostics[0]?.code === code &&
        error.diagnostics[0]?.path === `${prefix}${path}`,
    );
  }
}
const heightParagraph = paragraph("A\nB\nC", {
  defaultStyle: { font: "Helvetica", fontSize: 10.3, color: [0, 0, 0] },
  lineHeight: 10.3,
});
test("R1 translated height fits kept/split paragraphs and separate blocks; next endpoint changes fit", () => {
  for (const keepTogether of [false, true]) {
    const input = flow([{ type: "paragraph", paragraph: heightParagraph, keepTogether }], {
      height: 730.9,
      margins: { top: 700, right: 0, bottom: 0, left: 0 },
    });
    const document = agrees(input);
    assert.equal(document.pages[0]?.children[2]?.type, "richText");
    const smaller = { ...input, pageTemplate: { ...input.pageTemplate, height: value(bits(730.9) - 1n) } };
    if (keepTogether) rejects(smaller, "LAYOUT_OVERSIZED", "/body/0");
    else agrees(smaller, 2);
    agrees({ ...input, pageTemplate: { ...input.pageTemplate, height: value(bits(730.9) + 1n) } });
    agrees({
      ...input,
      body: ["A", "B", "C"].map((text) => ({
        type: "paragraph",
        paragraph: {
          ...heightParagraph,
          runs: [{ text }],
        },
      })),
    });
  }
});
test("R1 translated width fits nine Helvetica As in every alignment and remeasures generated lines", () => {
  for (const align of ["left", "center", "right"] as const) {
    const input = flow([{ type: "paragraph", paragraph: paragraph("AAAAAAAAA", { align, breakLongWords: "error" }) }], {
      width: 760.03,
      margins: { top: 0, right: 0, bottom: 0, left: 700 },
    });
    const node = agrees(input).pages[0]?.children[0];
    assert.ok(node?.type === "richText");
    const result = measureText({ width: node.width, paragraphs: node.paragraphs });
    assert.equal(result.lineCount, 1);
    assert.equal(result.lines[0]?.advance, 60.03);
    assert.ok(node.x + node.width <= input.pageTemplate.width);
    rejects(
      { ...input, pageTemplate: { ...input.pageTemplate, width: value(bits(760.03) - 1n) } },
      "TOKEN_OVERFLOW",
      "/body/0/paragraph/runs/0/text",
    );
    agrees({ ...input, pageTemplate: { ...input.pageTemplate, width: value(bits(760.03) + 1n) } });
  }
});
test("fractional repeated regions, gaps, right/bottom reservations use the same actual boundaries", () => {
  const input = flow([{ type: "paragraph", paragraph: heightParagraph }], {
    width: 800.28,
    height: 800.9,
    margins: { top: 600.125, right: 40.25, bottom: 40.25, left: 700 },
    header: { height: 99.625, children: [{ ...fixed("H"), width: 20 }] },
    headerBodyGap: 0.25,
    footer: { height: 29.5, children: [{ ...fixed("F"), width: 20 }] },
    bodyFooterGap: 0.25,
  });
  const document = agrees(input);
  const children = document.pages[0]?.children;
  assert.ok(children && children.length === 5);
  const last = children[3];
  assert.ok(last?.type === "richText" && last.y + last.height <= 730.9);
  agrees({ ...input, body: [{ type: "paragraph", paragraph: paragraph("AAAAAAAAA", { breakLongWords: "error" }) }] });
});
test("ill-conditioned axes reject even empty bodies before measurement, never admit material overflow", () => {
  for (const body of [
    [],
    [{ type: "spacer" as const, height: 3 }],
    Array.from({ length: 3 }, () => ({ type: "spacer" as const, height: 1 })),
  ]) {
    rejects(
      flow(body, { width: 1e16, margins: { top: 0, right: 0, bottom: 0, left: 1e16 - 2 } }),
      "GEOMETRY",
      "/pageTemplate/width",
    );
    rejects(
      flow(body, { height: 1e16, margins: { top: 1e16 - 2, right: 0, bottom: 0, left: 0 } }),
      "GEOMETRY",
      "/pageTemplate/height",
    );
  }
});
test("whole-template conditioning admits the exact 32-ULP threshold on both axes", () => {
  const start = 1 - 1 / 64;
  agrees(flow([], { width: 1, margins: { top: 0, right: 0, bottom: 0, left: start } }));
  agrees(flow([], { height: 1, margins: { top: start, right: 0, bottom: 0, left: 0 } }));
  rejects(
    flow([], { width: 1, margins: { top: 0, right: 0, bottom: 0, left: value(bits(start) + 1n) } }),
    "GEOMETRY",
    "/pageTemplate/width",
  );
  rejects(
    flow([], { height: 1, margins: { top: value(bits(start) + 1n), right: 0, bottom: 0, left: 0 } }),
    "GEOMETRY",
    "/pageTemplate/height",
  );
});
test("capacity cannot mask empty/negative regions, reserved overlap or explicit fixed block heights", () => {
  for (const top of [40, 41])
    rejects(flow([], { margins: { top, right: 0, bottom: 0, left: 0 } }), "GEOMETRY", "/pageTemplate/height");
  rejects(
    flow([], { header: { height: 21, children: [] }, footer: { height: 20, children: [] } }),
    "GEOMETRY",
    "/pageTemplate/height",
  );
  rejects(
    flow([
      { type: "fixed", height: value(bits(10) - 1n), children: [{ type: "rect", x: 0, y: 0, width: 80, height: 10 }] },
    ]),
    "BOUNDS",
    "/body/0/children/0",
  );
});
test("materialized association must fit: local measurement tolerance cannot move a generated baseline", () => {
  rejects(flow([{ type: "paragraph", paragraph: heightParagraph }], { height: 30.9 }), "GEOMETRY", "/body/0");
  assert.equal(measureText({ width: 100, height: 30.9, paragraphs: [heightParagraph] }).lineCount, 3);
});
test("native line/block association cannot overlap another body reservation or a repeated region", () => {
  const p = paragraph("A\nB\nC", {
    defaultStyle: { font: "Helvetica", fontSize: 0.1, color: [0, 0, 0] },
    lineHeight: 0.1,
  });
  const template = { height: 1.5, margins: { top: 1, right: 0, bottom: 0, left: 0 } };
  rejects(flow([{ type: "paragraph", paragraph: p }], template), "GEOMETRY", "/body/0");
  rejects(
    flow(
      ["A", "B", "C"].map((text) => ({ type: "paragraph", paragraph: { ...p, runs: [{ text }] } })),
      template,
    ),
    "GEOMETRY",
    "/body/2",
  );
  rejects(
    flow([], {
      height: 800.9,
      margins: { top: 0, right: 0, bottom: 40.1, left: 0 },
      footer: { height: 29.7, children: [] },
      bodyFooterGap: 0.2,
    }),
    "GEOMETRY",
    "/pageTemplate/height",
  );
});
test("unknown and component definitions cannot supply a derived capacity or precision certificate", () => {
  const input = flow();
  const capacity = { ...input, pageTemplate: { ...input.pageTemplate, capacity: 1e20 } };
  rejects(capacity, "KEY", "/pageTemplate/capacity");
  const certificate = { ...input, horizontal: { start: 0, end: 100, nominalExtent: 100, capacity: 1e20 } };
  rejects(certificate, "KEY", "/horizontal");
});
