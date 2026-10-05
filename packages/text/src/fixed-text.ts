import type { TextNode } from "@updf/core";
import { fail, ledger, type WorkLedger, work } from "@updf/core/internal";
import type { MeasuredText, TextMetrics } from "@updf/core/resources";
import { type ResolvedTextResources as ResolvedFonts, selectedFont, textRuntime } from "./text-resources.js";

function wrapParagraph(
  paragraph: string,
  node: TextNode,
  path: string,
  budget: WorkLedger,
  measure: (text: string) => TextMetrics,
): string[] {
  const tokens = paragraph.match(/ +|[^ ]+/g) ?? [];
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    if (measure(token).advance > node.width) {
      fail("TOKEN_OVERFLOW", path, "A token exceeds the text box width");
    }
    if (measure(current + token).advance > node.width) {
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
  const runtime = textRuntime(fonts, path);
  const measure = (text: string): TextMetrics => runtime.measure(font, text, node.fontSize, "fixed", path);
  const policy = runtime.fixedPolicy(font, path);
  const lines =
    node.text === "" ? [] : node.text.split("\n").flatMap((p) => wrapParagraph(p, node, path, budget, measure));
  if (lines.length > Math.floor(node.height / node.lineHeight)) {
    fail("VERTICAL_OVERFLOW", path, "Text exceeds the text box height");
  }
  const envelope = measure(node.text.replaceAll("\n", ""));
  if (policy.checkInk && envelope.ascent + envelope.descent > node.lineHeight)
    fail("FONT_INK", path, "Selected glyph ascent/descent exceeds lineHeight");
  const baseline =
    policy.baseline === "ascent"
      ? envelope.ascent
      : envelope.ascent + (node.lineHeight - envelope.ascent - envelope.descent) / 2;
  return {
    ...node,
    lines: lines.map((text, i) => {
      const metrics = measure(text);
      const spare = node.width - metrics.advance;
      const offset = node.align === "center" ? spare / 2 : node.align === "right" ? spare : 0;
      const tolerance = Number.EPSILON * Math.max(1, node.width, node.fontSize) * 16;
      if (policy.checkInk && (offset + metrics.left < -tolerance || offset + metrics.right > node.width + tolerance))
        fail("FONT_INK", path, "Selected glyph horizontal ink exceeds the text box; adjust alignment/box");
      return { text, x: node.x + offset, y: node.y + i * node.lineHeight + baseline, run: metrics.run, path };
    }),
  };
}
