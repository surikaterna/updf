import assert from "node:assert/strict";
import test from "node:test";
import { PdfWriter } from "../../packages/core/dist/cjs/core/pdf-writer.js";
import { fixtureFont, fontDocument, fontText } from "../fixtures/fonts/font-fixture.js";
import { render } from "../fixtures/text-options.js";

test("production font, page, painting and stream consumers use the one typed writer", async (context) => {
  const definitions = context.mock.method(PdfWriter.prototype, "define");
  const streams = context.mock.method(PdfWriter.prototype, "defineStream");
  const roots = context.mock.method(PdfWriter.prototype, "setRoot");
  const seal = context.mock.method(PdfWriter.prototype, "seal");
  const source = fontDocument([fontText("Москва")]);
  const rect = {
    type: "rect",
    x: 20,
    y: 60,
    width: 20,
    height: 20,
    paint: { fill: [1, 0, 0], stroke: null, fillOpacity: 0.4 },
  } as const;
  const document = { ...source, pages: source.pages.map((page) => ({ ...page, children: [...page.children, rect] })) };
  const options = { resources: { Demo: await fixtureFont() } };
  const bytes = render(document, options);
  assert.equal(seal.mock.callCount(), 1);
  assert.equal(roots.mock.callCount(), 1);
  assert.equal(seal.mock.calls[0]?.arguments.length, 0);
  assert.equal(roots.mock.calls[0]?.arguments[0], definitions.mock.calls[0]?.arguments[0]);
  const types = definitions.mock.calls.map((call) => (call.arguments[1] as { Type?: { value: string } }).Type?.value);
  assert.deepEqual(
    types.filter(Boolean).sort(),
    ["Catalog", "Pages", "Page", "Font", "Font", "FontDescriptor", "ExtGState"].sort(),
  );
  assert.equal(streams.mock.callCount(), 4);
  // The explicit but unused Helvetica binding must not allocate a PDF font object.
  assert.doesNotMatch(Buffer.from(bytes).toString("latin1"), /\/BaseFont \/Helvetica/);
  const writer = seal.mock.calls[0]?.this;
  assert.equal(roots.mock.calls[0]?.this, writer);
  for (const call of [...definitions.mock.calls, ...streams.mock.calls]) assert.equal(call.this, writer);
  assert.deepEqual(render(document, { ...options, limits: { outputBytes: bytes.length } }), bytes);
  assert.throws(() => render(document, { ...options, limits: { outputBytes: bytes.length - 1 } }), /PDF output bytes/);
});
