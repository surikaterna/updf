import { fail } from "../core/error.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

export interface FontUsage {
  readonly font: PreparedFont;
  readonly key: string;
  readonly glyphs: PreparedGlyph[];
  readonly cids: Map<number, number>;
}

export function addGlyph(usage: FontUsage, glyph: PreparedGlyph): void {
  if (usage.cids.has(glyph.codePoint)) return;
  if (usage.glyphs.length >= 65535) fail("LIMIT", "", "Font CID budget exceeded");
  usage.glyphs.push(glyph);
  // CID0 is reserved. Different codepoints remain distinct even with a shared GID.
  usage.cids.set(glyph.codePoint, usage.glyphs.length);
}

export function encodeRun(usage: FontUsage, glyphs: readonly PreparedGlyph[]): string {
  return glyphs
    .map((glyph) => {
      const cid = usage.cids.get(glyph.codePoint);
      if (cid === undefined) fail("FONT_DATA", "", "Unregistered glyph codepoint");
      return cid.toString(16).padStart(4, "0");
    })
    .join("");
}

export function utf16hex(codePoint: number): string {
  if (codePoint <= 0xffff) return codePoint.toString(16).padStart(4, "0");
  const value = codePoint - 0x10000;
  return ((value >> 10) + 0xd800).toString(16) + ((value & 1023) + 0xdc00).toString(16);
}
