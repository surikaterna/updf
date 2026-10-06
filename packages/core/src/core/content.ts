import { painting } from "../nodes/wiring.js";
import { painted } from "../painting/pdf.js";
import type { MeasuredNode, MeasuredPage } from "./plan.js";
import { checkLimit } from "./policy.js";
import { type PageResources, xObjectSlot } from "./resource-types.js";
import { textCommand } from "./text-paint.js";

type Push = (chunk: string) => void;
function emit(nodes: readonly MeasuredNode[], height: number, resources: PageResources, push: Push): void {
  const tasks: ({ node: MeasuredNode; local: boolean } | "close")[] = [];
  const schedule = (items: readonly MeasuredNode[], local: boolean): void => {
    for (let i = items.length - 1; i >= 0; i--) {
      const node = items[i];
      if (node) tasks.push({ node, local });
    }
  };
  schedule(nodes, false);
  while (tasks.length) {
    const task = tasks.pop();
    if (!task) break;
    if (task === "close") {
      push("Q\n");
      continue;
    }
    const { node, local } = task;
    painting(node.type)(node, {
      height,
      local,
      push,
      drawing: (drawing) => painted(drawing, height, local, resources),
      text: (fragment, x, y, size) => textCommand(fragment, x, y, size, height, local, resources),
      xObjectKey: (site) => resources.painting(site, xObjectSlot).key,
    });
    if (node.type === "paintGroup") {
      tasks.push("close");
      schedule(node.children, true);
    }
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
  emit(page.children, page.height, resources, push);
  return result;
}
