import { fail } from "../core/error.js";
import type { MeasuredLine, MeasuredNode, MeasuredPage } from "../core/plan.js";
import { descendants } from "../core/traversal.js";
import type { PrivateFragment } from "../measurement/lines.js";
import type { PreparedFont, PreparedGlyph } from "./types.js";

export interface FontUsage {
  readonly font: PreparedFont;
  readonly key: string;
  readonly glyphs: PreparedGlyph[];
  readonly cids: Map<number, number>;
}

export function collectFonts(pages: readonly MeasuredPage[]): readonly FontUsage[] {
  const usages = new Map<PreparedFont, FontUsage>();
  for (const page of pages) collectNodes(page.children, usages);
  return [...usages.values()];
}
function collectNodes(nodes: readonly MeasuredNode[], usages: Map<PreparedFont, FontUsage>): void {
  for (const node of descendants(nodes, (node) => (node.type === "paintGroup" ? node.children : []))) {
    if (node.type === "richText") {
      for (const fragment of node.fragments) collectFragment(fragment, usages);
    } else if (node.type === "text" && node.preparedFont && node.lines.length)
      collectText(node.preparedFont, node.lines, usages);
  }
}
function collectFragment(fragment: PrivateFragment, usages: Map<PreparedFont, FontUsage>): void {
  if (!fragment.preparedFont) return;
  collectText(
    fragment.preparedFont,
    [
      {
        text: fragment.text,
        x: fragment.x,
        y: fragment.baseline,
        ...(fragment.glyphs ? { glyphs: fragment.glyphs } : {}),
      },
    ],
    usages,
  );
}

function collectText(font: PreparedFont, lines: readonly MeasuredLine[], usages: Map<PreparedFont, FontUsage>): void {
  let usage = usages.get(font);
  if (!usage) {
    usage = { font, key: `F${usages.size + 2}`, glyphs: [], cids: new Map() };
    usages.set(font, usage);
  }
  for (const line of lines) {
    if (!line.glyphs) fail("FONT_DATA", "", "Missing measured glyph run");
    for (const glyph of line.glyphs) addGlyph(usage, glyph);
  }
}

function addGlyph(usage: FontUsage, glyph: PreparedGlyph): void {
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
