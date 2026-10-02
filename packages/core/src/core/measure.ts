import { measureFontText } from "../fonts/measure.js";
import { type ResolvedFonts, selectedFont } from "../fonts/resources.js";
import { matrix } from "../painting/affine.js";
import { clip, drawing } from "../painting/read.js";
import type { DocumentDefinition, NodeDefinition, TextNode } from "../types.js";
import { fail } from "./error.js";
import { inkAscent, textWidth } from "./metrics.js";
import type { MeasuredNode, MeasuredPage, MeasuredText } from "./plan.js";

function measuredNode(node: NodeDefinition, path: string, fonts: ResolvedFonts): MeasuredNode {
  if (node.type === "text") return measureText(node, `${path}/text`, fonts);
  if (node.type === "paintGroup") {
    const clipping = clip(node.clip, `${path}/clip`);
    return {
      type: "paintGroup",
      matrix: matrix(node.transform, `${path}/transform`),
      ...(clipping ? { clip: clipping } : {}),
      children: node.children.map((child, i) => measuredNode(child, `${path}/children/${i}`, fonts)),
    };
  }
  if (node.type === "path") return { ...node, painting: drawing({ ...node }, path) };
  return node.paint !== undefined || node.transform !== undefined
    ? { ...node, painting: drawing({ ...node }, path) }
    : { ...node };
}

function wrapParagraph(paragraph: string, node: TextNode, path: string): string[] {
  const tokens = paragraph.match(/ +|[^ ]+/g) ?? [];
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    if (textWidth(token, node.fontSize) > node.width) {
      fail("TOKEN_OVERFLOW", path, "A token exceeds the text box width");
    }
    if (textWidth(current + token, node.fontSize) > node.width) {
      lines.push(current);
      current = token;
    } else current += token;
  }
  lines.push(current);
  return lines;
}

function measureText(node: TextNode, path: string, fonts: ResolvedFonts): MeasuredText {
  const font = selectedFont(node.font, fonts, path);
  if (font) return measureFontText(node, font, path);
  const lines = node.text === "" ? [] : node.text.split("\n").flatMap((p) => wrapParagraph(p, node, path));
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

export function measure(document: DocumentDefinition, fonts: ResolvedFonts = new Map()): readonly MeasuredPage[] {
  return document.pages.map((page, i) => ({
    width: page.width,
    height: page.height,
    children: page.children.map((node, j) => measuredNode(node, `/pages/${i}/children/${j}`, fonts)),
  }));
}
