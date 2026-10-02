import { encodeRun, type FontUsage } from "../fonts/cids.js";
import type { Alpha } from "../painting/alpha.js";
import { painted } from "../painting/pdf.js";
import { fail, limits } from "./error.js";
import { literal, decimal as n, value } from "./pdf-values.js";
import type { MeasuredLine, MeasuredNode, MeasuredPage, MeasuredPaintGroup, MeasuredText } from "./plan.js";

function textCommand(
  node: MeasuredText,
  line: MeasuredLine,
  height: number,
  local: boolean,
  fonts: readonly FontUsage[],
): string {
  let key = "F1";
  let encoded = value(literal(line.text));
  if (node.preparedFont) {
    const font = fonts.find((item) => item.font === node.preparedFont);
    if (!font || !line.glyphs) fail("FONT_DATA", "", "Unregistered measured font/run");
    key = font.key;
    encoded = `<${encodeRun(font, line.glyphs)}>`;
  }
  const position = local ? `1 0 0 -1 ${n(line.x)} ${n(line.y)}` : `1 0 0 1 ${n(line.x)} ${n(height - line.y)}`;
  return `BT /${key} ${n(node.fontSize)} Tf ${position} Tm ${encoded} Tj ET\n`;
}
type Push = (chunk: string) => void;
function group(
  node: MeasuredPaintGroup,
  height: number,
  local: boolean,
  fonts: readonly FontUsage[],
  alphas: readonly Alpha[],
  push: Push,
): void {
  push("q\n");
  if (!local) push(`1 0 0 -1 0 ${n(height)} cm\n`);
  push(`${node.matrix.map(n).join(" ")} cm\n`);
  if (node.clip) push(`${n(node.clip.x)} ${n(node.clip.y)} ${n(node.clip.width)} ${n(node.clip.height)} re W n\n`);
  emit(node.children, height, true, fonts, alphas, push);
  push("Q\n");
}
function emit(
  nodes: readonly MeasuredNode[],
  height: number,
  local: boolean,
  fonts: readonly FontUsage[],
  alphas: readonly Alpha[],
  push: Push,
): void {
  for (const node of nodes) {
    if (node.type === "paintGroup") {
      group(node, height, local, fonts, alphas, push);
      continue;
    }
    if (node.type !== "text" && node.painting) {
      painted(node.painting, height, local, alphas).forEach(push);
      continue;
    }
    if (node.type === "text") {
      if (local) push("q\n0 0 0 rg\n");
      for (const line of node.lines) push(textCommand(node, line, height, local, fonts));
      if (local) push("Q\n");
    } else if (node.type === "rect") {
      push(
        local
          ? `q\n0 0 0 RG\n0.5 w\n${n(node.x)} ${n(node.y)} ${n(node.width)} ${n(node.height)} re S\nQ\n`
          : `${n(node.x)} ${n(height - node.y - node.height)} ${n(node.width)} ${n(node.height)} re S\n`,
      );
    } else if (node.type === "line") {
      push(
        local
          ? `q\n0 0 0 RG\n0.5 w\n${n(node.x)} ${n(node.y)} m ${n(node.x2)} ${n(node.y2)} l S\nQ\n`
          : `${n(node.x)} ${n(height - node.y)} m ${n(node.x2)} ${n(height - node.y2)} l S\n`,
      );
    }
  }
}
export function commands(
  page: MeasuredPage,
  budget: { length: number },
  fonts: readonly FontUsage[],
  alphas: readonly Alpha[],
): string[] {
  const result: string[] = [];
  const push: Push = (chunk) => {
    budget.length += chunk.length;
    if (budget.length > limits.bytes) fail("LIMIT", "", "PDF output exceeds 10 MiB");
    result.push(chunk);
  };
  push("0.5 w\n");
  emit(page.children, page.height, false, fonts, alphas, push);
  return result;
}
