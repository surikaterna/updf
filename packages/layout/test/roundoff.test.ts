import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError } from "@updf/core";
import { h } from "@updf/core/vdom";
import { lower, render } from "../../../tests/fixtures/text-options.js";
import { LegacyFlow as Flow, layoutFlow } from "../../../tests/fixtures/transitional-layout.js";
import { flow, paragraph } from "./fixtures.js";

test("translated rich decimal fits agree with final geometry without shrinking or visible overflow", () => {
  const definition = flow(
    [
      {
        type: "paragraph",
        paragraph: paragraph("A\nB\nC", {
          defaultStyle: { font: "Helvetica", fontSize: 10.3, color: [0, 0, 0] },
          lineHeight: 10.3,
        }),
      },
    ],
    { height: 730.9, margins: { top: 700, right: 0, bottom: 0, left: 0 } },
  );
  const result = layoutFlow(definition);
  assert.equal(result.pageCount, 1);
  assert.equal(result.placements[0]?.box.height, 30.900000000000002);
  assert.deepEqual(render(result.document), render(lower(h(Flow.Document, definition))));
  const smaller = layoutFlow({ ...definition, pageTemplate: { ...definition.pageTemplate, height: 730.9 - 1e-10 } });
  assert.equal(smaller.pageCount, 2);
  assert.throws(
    () =>
      render({
        version: 1,
        pages: [
          {
            width: 100,
            height: 30.9,
            children: [
              {
                type: "richText",
                x: 0,
                y: 20.6 + 1e-10,
                width: 100,
                height: 10.3,
                paragraphs: [paragraph("A", { lineHeight: 10.3 })],
              },
            ],
          },
        ],
      }),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "BOUNDS",
  );
});
