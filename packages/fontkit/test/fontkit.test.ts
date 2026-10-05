import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { type DiagnosticCode, DocumentError, render } from "@updf/core";
import { prepareFont } from "@updf/fontkit";
import { fontDocument, fontText } from "../../../tests/fixtures/fonts/font-fixture.js";
import { fontOptions } from "../../../tests/fixtures/fonts/font-options.js";

const fixture = async () =>
  new Uint8Array(await readFile(new URL("../../../tests/fixtures/fonts/LiberationSans-Regular.ttf", import.meta.url)));
function entry(bytes: Uint8Array, tag: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + i * 16;
    if (String.fromCharCode(...bytes.subarray(at, at + 4)) === tag) return at;
  }
  throw new Error(`Missing fixture ${tag}`);
}
function rejects(bytes: Uint8Array<ArrayBuffer>, code: DiagnosticCode = "FONT_FORMAT"): void {
  assert.throws(
    () => prepareFont(bytes),
    (error: unknown) => error instanceof DocumentError && error.diagnostics[0]?.code === code,
  );
}

test("public Fontkit preparation is owned, deterministic, uses actual glyph metrics and accepts subviews", async () => {
  const original = await fixture();
  const backing = new Uint8Array(original.length + 20);
  backing.set(original, 10);
  const font = prepareFont(backing.subarray(10, -10));
  const document = fontDocument([fontText("Москва - Latin ABC")]);
  const options = fontOptions({ resources: { Demo: font } });
  const before = render(document, options);
  backing.fill(0);
  assert.deepEqual(render(document, options), before);
  assert.deepEqual(font.metadata, prepareFont(original).metadata);
  assert.equal(font.metadata.embeddingRights, "installable");
  assert.equal(font.metadata.descriptor.postscriptName, "LiberationSans");
  assert.equal(font.metadata.glyphCount, 2620);
  assert.ok(font.metadata.glyphs.some((glyph) => glyph.codePoint === 0x41f && glyph.glyphId > 0));
  assert.ok(!font.metadata.glyphs.some((glyph) => glyph.codePoint === 10 || glyph.glyphId === 0));
});

test("size and unsupported signatures are rejected before attempting parser metrics", async () => {
  rejects(new Uint8Array(4 * 1024 * 1024 + 1), "LIMIT");
  rejects(new Uint8Array(1));
  for (const signature of ["ttcf", "wOFF", "wOF2", "OTTO", "junk"]) {
    const bytes = await fixture();
    bytes.set(Array.from(signature, (char) => char.charCodeAt(0)));
    rejects(bytes);
  }
});

test("directory/table bounds and missing/overlapping required tables fail structurally", async () => {
  const original = await fixture();
  rejects(original.slice(0, 100));
  const bad = original.slice();
  new DataView(bad.buffer).setUint32(entry(bad, "glyf") + 12, 0xffffffff);
  rejects(bad);
  const missing = original.slice();
  missing.set([88, 88, 88, 88], entry(missing, "loca"));
  rejects(missing);
  const overlap = original.slice();
  const view = new DataView(overlap.buffer);
  view.setUint32(entry(overlap, "glyf") + 8, view.getUint32(entry(overlap, "head") + 8));
  rejects(overlap);
  const badLoca = original.slice();
  const offsets = new DataView(badLoca.buffer);
  offsets.setUint32(offsets.getUint32(entry(badLoca, "loca") + 8), 0xffffffff);
  rejects(badLoca);
});

test("CFF/variations/color tables are rejected, without pretending synthetic tags are usable fonts", async () => {
  for (const tag of ["CFF ", "CFF2", "fvar", "gvar", "HVAR", "COLR", "CPAL", "sbix", "SVG ", "CBDT"]) {
    const bytes = await fixture();
    bytes.set(
      Array.from(tag, (char) => char.charCodeAt(0)),
      entry(bytes, "kern"),
    );
    rejects(bytes);
  }
});

test("OS2 embedding restrictions enforced; full-font no-subsetting restriction is honored", async () => {
  for (const flag of [2, 0x200, 0x10, 0xffff]) {
    const bytes = await fixture();
    const view = new DataView(bytes.buffer);
    view.setUint16(view.getUint32(entry(bytes, "OS/2") + 8) + 8, flag);
    rejects(bytes, "FONT_RIGHTS");
  }
  for (const [flag, right] of [
    [4, "preview-print"],
    [8, "editable"],
    [0x100, "installable"],
  ] as const) {
    const bytes = await fixture();
    const view = new DataView(bytes.buffer);
    view.setUint16(view.getUint32(entry(bytes, "OS/2") + 8) + 8, flag);
    assert.equal(prepareFont(bytes).metadata.embeddingRights, right);
  }
});

test("malformed cmap range pointers are caught and subsequent valid preparation still works", async () => {
  const bytes = await fixture();
  const view = new DataView(bytes.buffer);
  const offset = view.getUint32(entry(bytes, "cmap") + 8);
  view.setUint32(offset + 8, 0xffffffff);
  rejects(bytes);
  assert.ok(prepareFont(await fixture()).metadata.glyphs.length > 1000);
});

test("oversized contiguous inventory and parser-level malformed name data remain structured", async () => {
  const bytes = await fixture();
  const view = new DataView(bytes.buffer);
  const cmap = view.getUint32(entry(bytes, "cmap") + 8);
  const subtable = cmap + view.getUint32(cmap + 8);
  view.setUint16(subtable, 10);
  view.setUint32(subtable + 4, 20);
  view.setUint32(subtable + 12, 0);
  view.setUint32(subtable + 16, 65536);
  rejects(bytes, "LIMIT");
  const malformedName = await fixture();
  const names = new DataView(malformedName.buffer);
  const offset = names.getUint32(entry(malformedName, "name") + 8);
  names.setUint16(offset + 2, 65535);
  rejects(malformedName);
});
