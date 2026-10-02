import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { FontBounds, PreparedFontInput, PreparedGlyph } from "@updf/core/fonts";

// Developer-only reader of FontTools' known TTX dump, not a binary font parser.
function section(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  assert.ok(match?.[1], `Missing TTX ${tag}`);
  return match[1];
}
function field(xml: string, key: string): number {
  const match = xml.match(new RegExp(`<${key} value="([^"]+)"`));
  assert.ok(match?.[1]);
  const result = Number(match[1]);
  assert.ok(Number.isFinite(result));
  return result;
}
function attribute(xml: string, key: string): string {
  const value = xml.match(new RegExp(`${key}="([^"]+)"`))?.[1];
  assert.ok(value !== undefined);
  return value;
}
function box(xml: string): FontBounds {
  if (!xml.includes("xMin=")) return [0, 0, 0, 0];
  return [
    Number(attribute(xml, "xMin")),
    Number(attribute(xml, "yMin")),
    Number(attribute(xml, "xMax")),
    Number(attribute(xml, "yMax")),
  ];
}
function mappings(xml: string): PreparedGlyph[] {
  const ids = new Map(
    [...section(xml, "GlyphOrder").matchAll(/<GlyphID ([^>]+)\/>/g)].map((match) => [
      attribute(match[0], "name"),
      Number(attribute(match[0], "id")),
    ]),
  );
  const advances = new Map(
    [...section(xml, "hmtx").matchAll(/<mtx [^>]+\/>/g)].map((match) => [
      attribute(match[0], "name"),
      Number(attribute(match[0], "width")),
    ]),
  );
  const ink = new Map(
    [...section(xml, "glyf").matchAll(/<TTGlyph [^>]+>/g)].map((match) => [attribute(match[0], "name"), box(match[0])]),
  );
  const result: PreparedGlyph[] = [];
  for (const match of section(xml, "cmap_format_4").matchAll(/<map [^>]+\/>/g)) {
    const name = attribute(match[0], "name");
    const glyphId = ids.get(name);
    const advance = advances.get(name);
    const bounds = ink.get(name);
    assert.ok(glyphId !== undefined && advance !== undefined && bounds);
    if (glyphId) result.push({ codePoint: Number(attribute(match[0], "code")), glyphId, advance, bounds });
  }
  return result.sort((a, b) => a.codePoint - b.codePoint);
}

const path = process.argv[2];
if (!path) throw new Error("Usage: tsx scripts/prepare-fixture.ts FontTools.ttx");
const xml = await readFile(path, "utf8");
const root = new URL("../tests/fixtures/fonts/", import.meta.url);
const bytes = new Uint8Array(await readFile(new URL("LiberationSans-Regular.ttf", root)));
assert.equal(
  createHash("sha256").update(bytes).digest("hex"),
  "76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8",
);
assert.ok(xml.includes('<fsType value="00000000 00000000"/>'));
const head = section(xml, "head");
const hhea = section(xml, "hhea");
const data = {
  version: 1,
  format: "static-truetype",
  unitsPerEm: field(head, "unitsPerEm"),
  glyphCount: field(section(xml, "maxp"), "numGlyphs"),
  embeddingRights: "installable",
  descriptor: {
    postscriptName: "LiberationSans",
    flags: 32,
    bounds: [field(head, "xMin"), field(head, "yMin"), field(head, "xMax"), field(head, "yMax")],
    ascent: field(hhea, "ascent"),
    descent: field(hhea, "descent"),
    capHeight: field(section(xml, "OS_2"), "sCapHeight"),
    italicAngle: field(section(xml, "post"), "italicAngle"),
    stemV: 80,
  },
  glyphs: mappings(xml),
} satisfies Omit<PreparedFontInput, "bytes">;
await writeFile(new URL("liberation-sans.json", root), JSON.stringify(data, null, 2) + "\n");
console.log({ glyphMappings: data.glyphs.length, bytes: bytes.byteLength });
