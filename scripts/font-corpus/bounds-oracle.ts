import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import type { FontBounds, FontMetadata } from "@updf/fonts";
import { corpus } from "./manifest.js";
import type { CorpusFont } from "./types.js";

export interface BoundsOracle {
  readonly id: string;
  readonly sha256: string;
  readonly unitsPerEm: number;
  readonly glyphCount: number;
  readonly bounds: readonly FontBounds[];
}
export interface BoundsVerification {
  readonly status: "verified" | "mismatch";
  readonly checkedMappings: number;
  readonly differenceCount: number;
  readonly differences: readonly { codePoint: number; glyphId: number; actual: FontBounds; expected: FontBounds }[];
}
export function checkOracle(font: BoundsOracle, item: CorpusFont): void {
  assert.equal(font.id, item.id);
  assert.equal(font.sha256, item.font.sha256);
  assert.ok(Number.isInteger(font.unitsPerEm) && font.unitsPerEm >= 16 && font.unitsPerEm <= 16384);
  assert.ok(Number.isInteger(font.glyphCount) && font.glyphCount >= 2 && font.glyphCount <= 65535);
  assert.ok(Array.isArray(font.bounds) && font.bounds.length === font.glyphCount);
  for (const box of font.bounds) {
    assert.ok(Array.isArray(box) && box.length === 4 && box.every(Number.isSafeInteger));
    assert.ok(box[0] <= box[2] && box[1] <= box[3]);
  }
}
async function contents(path: string): Promise<string> {
  const file = await open(path, "r");
  try {
    const stat = await file.stat();
    assert.ok(stat.isFile() && stat.size <= 16 * 1024 * 1024, "Oracle exceeds 16 MiB");
    const buffer = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    assert.equal(length, stat.size, "Oracle changed while reading");
    return buffer.toString("utf8", 0, length);
  } finally {
    await file.close();
  }
}
export async function loadOracle(path: string, item: CorpusFont) {
  const text = await contents(path);
  const value = JSON.parse(text);
  assert.equal(value.version, 1);
  assert.equal(value.algorithm, "fonttools-fraction-quad-v1");
  assert.equal(value.coordinateModel, "materialized-binary64");
  assert.equal(value.fonttoolsVersion, "4.60.1");
  assert.equal(value.manifestSha256, createHash("sha256").update(JSON.stringify(corpus)).digest("hex"));
  assert.ok(Array.isArray(value.fonts) && value.fonts.length <= 100);
  const matching = value.fonts.filter((font: BoundsOracle) => font.id === item.id);
  assert.equal(matching.length, 1, "Expected exactly one oracle entry for selected font");
  const font = matching[0] as BoundsOracle;
  checkOracle(font, item);
  return { font, sha256: createHash("sha256").update(text).digest("hex") };
}
export function verifyBounds(metadata: FontMetadata, oracle: BoundsOracle): BoundsVerification {
  assert.equal(metadata.glyphCount, oracle.glyphCount);
  assert.equal(metadata.unitsPerEm, oracle.unitsPerEm);
  const differences = metadata.glyphs.filter((glyph) =>
    glyph.bounds.some((value, i) => value !== oracle.bounds[glyph.glyphId]![i]),
  );
  return {
    status: differences.length ? "mismatch" : "verified",
    checkedMappings: metadata.glyphs.length,
    differenceCount: differences.length,
    differences: differences.slice(0, 20).map((glyph) => ({
      codePoint: glyph.codePoint,
      glyphId: glyph.glyphId,
      actual: glyph.bounds,
      expected: oracle.bounds[glyph.glyphId]!,
    })),
  };
}
