import assert from "node:assert/strict";
import test from "node:test";
import {
  render as coreRender,
  renderUnknown as coreRenderUnknown,
  type DiagnosticCode,
  type DocumentDefinition,
  DocumentError,
  type OperationOptions,
} from "@updf/core";
import { createPreparedFont } from "@updf/fonts";
import {
  fixtureFont,
  fontDocument,
  fontInput,
  fontParagraph,
  fontText,
} from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";
import { record } from "../dist/cjs/checks.js";

const render = (document: DocumentDefinition, options: OperationOptions = {}) =>
  coreRender(document, fontOptions(options));
const renderUnknown = (document: unknown, options: OperationOptions = {}) =>
  coreRenderUnknown(document, fontOptions(options));

function rejects(run: () => unknown, code: DiagnosticCode): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof DocumentError);
    assert.equal(error.diagnostics[0]?.code, code);
    return true;
  });
}

test("prepared ownership copies bytes/metadata, exposes no mutable bytes or map, and tolerates input mutation", async () => {
  const input = await fontInput();
  const font = createPreparedFont(input);
  const document = fontDocument([fontText("Привет, мир!")]);
  const before = render(document, { resources: { Demo: font } });
  assert.ok(input.bytes instanceof Uint8Array);
  input.bytes.fill(0);
  record(input.descriptor, "/fixture");
  input.descriptor.postscriptName = "Changed";
  input.glyphs = [];
  assert.ok(Object.isFrozen(font) && Object.isFrozen(font.metadata) && Object.isFrozen(font.metadata.glyphs));
  assert.ok(!("bytes" in font) && !("glyphMap" in font));
  assert.equal(font.metadata.descriptor.postscriptName, "LiberationSans");
  assert.deepEqual(render(document, { resources: { Demo: font } }), before);
  assert.deepEqual(renderUnknown(JSON.parse(JSON.stringify(document)), { resources: { Demo: font } }), before);
});

test("unknown prepared metadata rejects unsupported format, rights, ranges, duplicate scalars and .notdef", async () => {
  const input = await fontInput();
  const font = createPreparedFont(input);
  for (const change of [
    { format: "woff2" },
    { version: 2 },
    { embeddingRights: "restricted" },
    { unitsPerEm: NaN },
    { glyphCount: 65536 },
  ]) {
    rejects(() => createPreparedFont({ ...input, ...change }), "FONT_DATA");
  }
  const glyph = font.metadata.glyphs.find((item) => item.codePoint === 65);
  assert.ok(glyph);
  for (const glyphs of [
    [glyph, glyph],
    [{ ...glyph, codePoint: 0xd800 }],
    [{ ...glyph, glyphId: 0 }],
    [{ ...glyph, advance: Infinity }],
    [{ ...glyph, bounds: [2, 0, 1, 1] }],
  ]) {
    rejects(() => createPreparedFont({ ...input, glyphs }), "FONT_DATA");
  }
  rejects(
    () => createPreparedFont({ ...input, descriptor: { ...font.metadata.descriptor, postscriptName: "Bad/Name" } }),
    "FONT_DATA",
  );
  rejects(() => createPreparedFont({ ...input, descriptor: { ...font.metadata.descriptor, flags: 4 } }), "FONT_DATA");
});

test("font data descriptors/prototypes and malformed resources never invoke caller getters", async () => {
  let calls = 0;
  const input = await fontInput();
  const bad = Object.defineProperty({ ...input }, "descriptor", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("called");
    },
  });
  rejects(() => createPreparedFont(bad), "FONT_DATA");
  rejects(() => createPreparedFont(new Date()), "FONT_DATA");
  rejects(() => createPreparedFont({ ...input, glyphs: Object.setPrototypeOf([], null) }), "FONT_DATA");
  const font = createPreparedFont(input);
  const resources = Object.defineProperty({}, "Demo", {
    enumerable: true,
    get() {
      calls++;
      throw new Error("called");
    },
  });
  rejects(() => coreRender(fontDocument([fontText("A")]), { ...fontOptions(), resources }), "TYPE");
  assert.ok(
    render(fontDocument([fontText("A", { paragraphs: [fontParagraph("A", "Helvetica")] })]), {
      resources: { Helvetica: font },
    }).length,
  );
  rejects(() => renderUnknown(fontDocument([fontText("A")]), { resources: { Demo: { ...font } } }), "RESOURCE");
  assert.equal(calls, 0);
});

test("optional unique font bytes/output caps, uncapped aliases and backing-byte safety", async () => {
  const input = await fontInput();
  rejects(
    () =>
      createPreparedFont(
        { ...input, bytes: new Uint8Array(4 * 1024 * 1024 + 1) },
        { limits: { resourceBytes: 4 * 1024 * 1024 } },
      ),
    "LIMIT",
  );
  rejects(() => createPreparedFont({ ...input, bytes: new Uint8Array(0) }), "FONT_DATA");
  rejects(() => createPreparedFont({ ...input, bytes: new Uint8Array(new SharedArrayBuffer(10)) }), "FONT_DATA");
  const font = await fixtureFont();
  const nine = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`Font${i}`, font]));
  assert.ok(render(fontDocument([]), { resources: nine }).length);
  const large = createPreparedFont({ ...input, bytes: new Uint8Array(4 * 1024 * 1024) });
  assert.ok(render(fontDocument([]), { profile: "service", resources: { A: large, B: large, C: large } }).length);
  const other = createPreparedFont({ ...input, bytes: new Uint8Array(4 * 1024 * 1024) });
  const children = Array.from({ length: 5 }, (_, i) =>
    fontText("A\n".repeat(2048), {
      paragraphs: [fontParagraph("A\n".repeat(2048), i % 2 ? "B" : "A", Number.MIN_VALUE, Number.MIN_VALUE)],
    }),
  );
  rejects(() => render(fontDocument(children), { profile: "service", resources: { A: large, B: other } }), "LIMIT");
  let calls = 0;
  const bytes = new Uint8Array(10);
  Object.defineProperty(bytes, "byteLength", {
    get() {
      calls++;
      throw new Error("called");
    },
  });
  assert.equal(createPreparedFont({ ...input, bytes }).metadata.byteLength, 10);
  assert.equal(calls, 0);
});

test("selected fonts require every glyph including ASCII and reject shaping/scripts/surrogates", async () => {
  const font = await fixtureFont();
  const options = { resources: { Demo: font } };
  rejects(
    () => render(fontDocument([fontText("x", { paragraphs: [fontParagraph("x", "Missing")] })]), options),
    "FONT_RESOURCE",
  );
  rejects(
    () => render(fontDocument([fontText("Москва", { paragraphs: [fontParagraph("Москва", "Helvetica")] })]), options),
    "CHARACTER",
  );
  for (const text of ["e\u0301", "\u202eABC", "A\u200dB", "A\ufe0f", "عربي", "Ελλάδα", "😀", "\t", "\r", "\u2028"]) {
    rejects(() => render(fontDocument([fontText(text)]), options), "FONT_PROFILE");
  }
  rejects(() => render(fontDocument([fontText("\ud800")]), options), "CHARACTER");
  const input = await fontInput();
  const empty = createPreparedFont({ ...input, glyphs: [] });
  assert.throws(
    () => render(fontDocument([fontText("A")]), { resources: { Demo: empty } }),
    (error: unknown) => {
      assert.ok(error instanceof DocumentError);
      assert.equal(error.diagnostics[0]?.code, "GLYPH_MISSING");
      assert.equal(error.diagnostics[0]?.path, "/pages/0/children/0/paragraphs/0/runs/0/text");
      assert.match(error.message, /U\+0041/);
      return true;
    },
  );
});
