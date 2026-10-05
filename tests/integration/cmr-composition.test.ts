import assert from "node:assert/strict";
import test from "node:test";
import { render } from "@updf/core";
import { cmrFixture, createCmrDocument, renderCMR } from "@updf/example-cmr/cmr";
import { createUnicodeCmrDocument, renderUnicodeCMR, unicodeCmrOptions } from "@updf/example-cmr/cmr-unicode";
import { fixtureFont } from "../fixtures/fonts/font-fixture.js";

test("CMR construction remains plain data; only the application renderer enables its font default", () => {
  const document = createCmrDocument(cmrFixture);
  assert.deepEqual(Object.keys(document), ["version", "pages"]);
  assert.throws(() => render(document), /explicit text service/);
  assert.match(Buffer.from(renderCMR(document)).toString("latin1"), /\/BaseFont \/Helvetica/);
  assert.deepEqual(renderCMR(document), renderCMR(createCmrDocument(cmrFixture)));
});

test("Unicode CMR AST consumers use explicit paired options; the convenience emits no unused Helvetica", async () => {
  const font = await fixtureFont();
  const document = createUnicodeCmrDocument(font);
  const options = unicodeCmrOptions(font);
  assert.throws(() => render(document, { resources: { CmrFont: font } }), /explicit text service/);
  const bytes = render(document, options);
  assert.deepEqual(renderUnicodeCMR(font), bytes);
  assert.doesNotMatch(Buffer.from(bytes).toString("latin1"), /\/BaseFont \/Helvetica/);
});
