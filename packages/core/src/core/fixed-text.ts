import { measureFontText } from "../fonts/measure.js";
import { type ResolvedFonts, selectedFont } from "../fonts/resources.js";
import { ledger, type WorkLedger, work } from "../measurement/ledger.js";
import type { TextNode } from "../types.js";
import { fail } from "./error.js";
import { inkAscent, textWidth } from "./metrics.js";
import type { MeasuredText } from "./plan.js";

function wrapParagraph(paragraph: string, node: TextNode, path: string, budget: WorkLedger): string[] {
  const tokens = paragraph.match(/ +|[^ ]+/g) ?? [];
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    if (textWidth(token, node.fontSize) > node.width) {
      fail("TOKEN_OVERFLOW", path, "A token exceeds the text box width");
    }
    if (textWidth(current + token, node.fontSize) > node.width) {
      work(budget, 2, path);
      lines.push(current);
      current = token;
    } else current += token;
  }
  work(budget, 2, path);
  lines.push(current);
  return lines;
}

export function measureFixedText(
  node: TextNode,
  path: string,
  fonts: ResolvedFonts,
  budget: WorkLedger = ledger(),
): MeasuredText {
  const font = selectedFont(node.font, fonts, path);
  if (font) return measureFontText(node, font, path, budget);
  const lines = node.text === "" ? [] : node.text.split("\n").flatMap((p) => wrapParagraph(p, node, path, budget));
  if (lines.length > Math.floor(node.height / node.lineHeight)) {
    fail("VERTICAL_OVERFLOW", path, "Text exceeds the text box height");
  }
  return {
    ...node,
    lines: lines.map((text, i) => {
      const spare = node.width - textWidth(text, node.fontSize);
      const offset = node.align === "center" ? spare / 2 : node.align === "right" ? spare : 0;
      // Reserve the entire ASCII ink envelope above/below every baseline.
      return { text, x: node.x + offset, y: node.y + i * node.lineHeight + node.fontSize * inkAscent };
    }),
  };
}
