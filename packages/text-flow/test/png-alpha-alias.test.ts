import assert from "node:assert/strict";
import test from "node:test";
import { h } from "@updf/core/vdom";
import { Document, Flow, layout } from "@updf/layout";
import { defineParticipation } from "@updf/layout/internal-participation";
import { prepareDocument, layoutPrepared } from "@updf/layout/internal-preparation";
import { images } from "@updf/images/load";
import { pngImages } from "@updf/images/png";
import { textFlow } from "@updf/text-flow";
import { pngAlphaShapes } from "@updf/text-flow/png-alpha";
import { aliasParticipation, checkParticipation } from "../../layout/dist/cjs/participation.js";
import { manualParticipation } from "../dist/cjs/manual-participation.js";
import { transport } from "../../images/test/url-helpers.js";
import { maskBlock } from "./png-alpha-fixture.js";

test("explicit canonical/legacy aliases share one compiler while foreign compilers and copies still reject", async () => {
  const { loader } = transport();
  const extensions = [textFlow({ handlers: [pngAlphaShapes()] }), images({ loader, formatHandlers: [pngImages()] })];
  const tree = (participation: typeof manualParticipation) =>
    h(Document, {
      children: h(Flow, {
        participation,
        pageSize: { width: 200, height: 200 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        children: maskBlock(0),
      }),
    });
  for (const owner of [manualParticipation, aliasParticipation(manualParticipation)]) {
    assert.equal(layoutPrepared(await prepareDocument(tree(owner), { extensions })).pageCount, 1);
  }
  let calls = 0;
  const foreign = defineParticipation(() => {
    calls++;
    return { blocks: [], close() {} };
  });
  assert.throws(() => layout(tree(foreign), { extensions }), /Conflicting/u);
  assert.equal(calls, 0);
  assert.throws(() => checkParticipation({ ...manualParticipation }));
});
