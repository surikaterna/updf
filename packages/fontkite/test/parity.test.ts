import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { render } from "@updf/core";
import { prepareFont } from "@updf/fontkite";
import { prepareFont as reference } from "@updf/fontkit";
import { isPreparedFont } from "@updf/fonts";
import { fontDocument, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { fixture } from "./helpers.js";

for (const weight of ["Regular", "Bold"]) {
  test(`${weight}: all prepared metadata and rendered PDF bytes match Fontkit`, async () => {
    const bytes = await fixture(weight),
      font = prepareFont(bytes),
      expected = reference(bytes);
    assert.ok(isPreparedFont(font));
    assert.deepEqual(font.metadata, expected.metadata);
    assert.equal(font.metadata.glyphs.length, 1472);
    assert.deepEqual(font.metadata.glyphs.find((glyph) => glyph.codePoint === 32)?.bounds, [0, 0, 0, 0]);
    const document = fontDocument([fontText("Москва — Latin ABC Àéñ 012345")]);
    assert.deepEqual(
      render(document, fontOptions({ resources: { Demo: font } })),
      render(document, fontOptions({ resources: { Demo: expected } })),
    );
  });
}

test("subview bytes are privately owned and prepared metadata is immutable", async () => {
  const bytes = await fixture(),
    backing = new Uint8Array(bytes.length + 20);
  backing.set(bytes, 10);
  const font = prepareFont(backing.subarray(10, -10));
  const document = fontDocument([fontText("Owned font Москва")]);
  const options = fontOptions({ resources: { Demo: font } }),
    before = render(document, options);
  backing.fill(0);
  assert.deepEqual(render(document, options), before);
  assert.ok(Object.isFrozen(font.metadata));
  assert.ok(Object.isFrozen(font.metadata.glyphs[0]!.bounds));
  assert.deepEqual(font.metadata, prepareFont(bytes).metadata);
});

test("Node ESM/CJS share canonical preparation and resource ownership", async () => {
  const require = createRequire(import.meta.url);
  const common = require("@updf/fontkite") as typeof import("@updf/fontkite");
  assert.equal(common.prepareFont, prepareFont);
  assert.ok(isPreparedFont(common.prepareFont(await fixture())));
});
