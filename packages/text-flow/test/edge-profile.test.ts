import assert from "node:assert/strict";
import test from "node:test";
import { DocumentError, render } from "@updf/core";
import { createExtensions, document, extension, flow, layout } from "@updf/layout";
import { createTextFlow, type EdgeProfileExclusion, type TextFlowProps } from "@updf/text-flow";
import { compositionOptions, installation } from "../../../tests/fixtures/text-flow/options.js";
import { silhouette } from "../../../tests/fixtures/text-flow/edge-profile.js";

const { textFlowAdapter } = createTextFlow(installation.capability);
function input(props: TextFlowProps, height = 200) {
  return document({
    children: flow({
      pageSize: { width: 60, height },
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      extensions: createExtensions([textFlowAdapter]),
      children: extension(textFlowAdapter, props),
    }),
  });
}
test("addon accepts the typed edge profile on both sides through the existing atomic/native pipeline", () => {
  const options = compositionOptions();
  for (const side of ["left", "right"] as const) {
    const fixture = silhouette(side);
    assert.ok(fixture.exclusion);
    const props = { paragraphs: fixture.paragraphs, exclusion: fixture.exclusion, style: { maxHeight: 200 } };
    const result = layout(input(props), options);
    assert.equal(result.pageCount, 1);
    const { text: _text, ...paintOnly } = options;
    assert.deepEqual(render(result.document, paintOnly), render(result.document, options));
  }
});
test("addon reports actual gapped height, rejects native oversize, and ignores unused profile geometry", () => {
  const options = compositionOptions(),
    fixture = silhouette("left", "AB");
  const exclusion: EdgeProfileExclusion = {
    shape: "edge-profile",
    side: "left",
    points: [
      { x: 60, y: 0 },
      { x: 60, y: 17 },
    ],
  };
  const props = { paragraphs: fixture.paragraphs, exclusion, style: { maxHeight: 200 } };
  assert.equal(layout(input(props, 48), options).pageCount, 1);
  assert.throws(
    () => layout(input(props, 47), options),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === "LAYOUT_OVERSIZED",
  );
  assert.equal(layout(input({ ...props, exclusion: { ...exclusion, top: 1000 } }, 16), options).pageCount, 1);
  assert.equal(layout(input({ ...props, paragraphs: [], style: { maxHeight: 0 } }, 1), options).pageCount, 1);
});
