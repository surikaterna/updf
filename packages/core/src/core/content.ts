import { fontAt } from "../fonts/provider.js";
import { painted } from "../painting/pdf.js";
import { decimal as n, value } from "./pdf-values.js";
import type {
  MeasuredLine,
  MeasuredNode,
  MeasuredPage,
  MeasuredPaintGroup,
  MeasuredRichText,
  MeasuredText,
} from "./plan.js";
import { checkLimit } from "./policy.js";
import type { PageResources } from "./resource-types.js";

function textCommand(
  node: MeasuredText,
  line: MeasuredLine,
  height: number,
  local: boolean,
  resources: PageResources,
): string {
  const { key, encoded } = fontAt(resources, line);
  const position = local ? `1 0 0 -1 ${n(line.x)} ${n(line.y)}` : `1 0 0 1 ${n(line.x)} ${n(height - line.y)}`;
  return `BT /${key} ${n(node.fontSize)} Tf ${position} Tm ${value(encoded)} Tj ET\n`;
}
type Push = (chunk: string) => void;
function richCommands(
  node: MeasuredRichText,
  height: number,
  local: boolean,
  resources: PageResources,
  push: Push,
): void {
  push("q\n");
  for (const fragment of node.fragments) {
    const { key, encoded } = fontAt(resources, fragment);
    const x = node.x + fragment.x;
    const y = node.y + fragment.baseline;
    const position = local ? `1 0 0 -1 ${n(x)} ${n(y)}` : `1 0 0 1 ${n(x)} ${n(height - y)}`;
    push(`${fragment.style.color.map(n).join(" ")} rg\n`);
    push(`BT /${key} ${n(fragment.style.fontSize)} Tf ${position} Tm ${value(encoded)} Tj ET\n`);
  }
  push("Q\n");
}
function group(node: MeasuredPaintGroup, height: number, local: boolean, push: Push): void {
  push("q\n");
  if (!local) push(`1 0 0 -1 0 ${n(height)} cm\n`);
  push(`${node.matrix.map(n).join(" ")} cm\n`);
  if (node.clip) push(`${n(node.clip.x)} ${n(node.clip.y)} ${n(node.clip.width)} ${n(node.clip.height)} re W n\n`);
}
function emit(
  nodes: readonly MeasuredNode[],
  height: number,
  local: boolean,
  resources: PageResources,
  push: Push,
): void {
  const tasks: ({ node: MeasuredNode; local: boolean } | "close")[] = [];
  const schedule = (items: readonly MeasuredNode[], local: boolean): void => {
    for (let i = items.length - 1; i >= 0; i--) {
      const node = items[i];
      if (node) tasks.push({ node, local });
    }
  };
  schedule(nodes, local);
  while (tasks.length) {
    const task = tasks.pop();
    if (!task) break;
    if (task === "close") {
      push("Q\n");
      continue;
    }
    const { node, local } = task;
    if (node.type === "richText") {
      richCommands(node, height, local, resources, push);
      continue;
    }
    if (node.type === "paintGroup") {
      group(node, height, local, push);
      tasks.push("close");
      schedule(node.children, true);
      continue;
    }
    leaf(node, height, local, resources, push);
  }
}
function leaf(
  node: Exclude<MeasuredNode, MeasuredPaintGroup | MeasuredRichText>,
  height: number,
  local: boolean,
  resources: PageResources,
  push: Push,
): void {
  if (node.type !== "text" && node.painting) {
    painted(node.painting, height, local, resources).forEach(push);
    return;
  }
  if (node.type === "text") {
    if (local) push("q\n0 0 0 rg\n");
    for (const line of node.lines) push(textCommand(node, line, height, local, resources));
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
export function commands(
  page: MeasuredPage,
  budget: { length: number; maximum: number },
  resources: PageResources,
): string[] {
  const result: string[] = [];
  const push: Push = (chunk) => {
    budget.length = checkLimit(budget.length + chunk.length, budget.maximum, "", "PDF output bytes");
    result.push(chunk);
  };
  push("0.5 w\n");
  emit(page.children, page.height, false, resources, push);
  return result;
}
