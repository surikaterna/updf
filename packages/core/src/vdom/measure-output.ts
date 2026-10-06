import type { ResolvedTextResources as ResolvedFonts } from "../core/text-resources.js";
import { textService } from "../core/text-resources.js";
import { measureXObject } from "../core/xobject-measure.js";
import type { WorkLedger } from "../measurement/ledger.js";
import type { DocumentDefinition, NodeDefinition } from "../types.js";

function visit(nodes: readonly NodeDefinition[], fonts: ResolvedFonts, budget: WorkLedger, path: string): void {
  const tasks: (() => void)[] = [];
  const schedule = (items: readonly NodeDefinition[], pointer: string): void => {
    items.forEach((node, i) => {
      tasks.push(() => {
        const at = `${pointer}/${i}`;
        if (node.type === "paintGroup") schedule(node.children, `${at}/children`);
        else if (node.type === "xObject") measureXObject(node, at, fonts.bindings);
        else if (node.type === "richText")
          textService(fonts, at).rich(
            { width: node.width, height: node.height, paragraphs: node.paragraphs },
            { bindings: fonts.bindings, budget },
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
