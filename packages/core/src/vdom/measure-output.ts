import type { ResolvedFonts } from "../fonts/resources.js";
import type { WorkLedger } from "../measurement/ledger.js";
import { rich } from "../measurement/measure.js";
import type { DocumentDefinition, NodeDefinition } from "../types.js";

function visit(nodes: readonly NodeDefinition[], fonts: ResolvedFonts, budget: WorkLedger, path: string): void {
  const tasks: (() => void)[] = [];
  const schedule = (items: readonly NodeDefinition[], pointer: string): void => {
    items.forEach((node, i) => {
      tasks.push(() => {
        const at = `${pointer}/${i}`;
        if (node.type === "paintGroup") schedule(node.children, `${at}/children`);
        else if (node.type === "richText")
          rich(
            { kind: "rich", width: node.width, height: node.height, paragraphs: node.paragraphs },
            fonts,
            budget,
            at,
          );
      });
    });
  };
  schedule(nodes, path);
  while (tasks.length) tasks.pop()?.();
}
export function measureOutput(document: DocumentDefinition, fonts: ResolvedFonts, budget: WorkLedger): void {
  // Rich ink/overflow diagnostics need the original VDOM origin. Fixed text keeps
  // its historical lower-then-render behavior; no new plain layout pass is added.
  document.pages.forEach((page, i) => {
    visit(page.children, fonts, budget, `/pages/${i}/children`);
  });
}
