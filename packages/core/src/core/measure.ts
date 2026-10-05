import { ledger, type WorkLedger } from "../measurement/ledger.js";
import { matrix } from "../painting/affine.js";
import { clip, drawing } from "../painting/read.js";
import type { DocumentDefinition, NodeDefinition } from "../types.js";
import type { MeasuredNode, MeasuredPage } from "./plan.js";
import { emptyTextResources, type ResolvedTextResources as ResolvedFonts, textService } from "./text-resources.js";

function measuredNode(
  node: NodeDefinition,
  path: string,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  tasks: (() => void)[],
): MeasuredNode {
  if (node.type === "text") {
    const result = textService(fonts, path).fixed(node, { bindings: fonts.bindings, budget }, `${path}/text`);
    return { ...node, lines: result.lines };
  }
  if (node.type === "richText") {
    const plan = textService(fonts, path).rich(
      { kind: "rich", width: node.width, height: node.height, paragraphs: node.paragraphs },
      { bindings: fonts.bindings, budget },
      path,
    );
    return { ...node, fragments: plan.fragments };
  }
  if (node.type === "paintGroup") {
    const clipping = clip(node.clip, `${path}/clip`);
    const children: MeasuredNode[] = [];
    schedule(node.children, children, `${path}/children`, fonts, budget, tasks);
    return {
      type: "paintGroup",
      matrix: matrix(node.transform, `${path}/transform`),
      ...(clipping ? { clip: clipping } : {}),
      children,
    };
  }
  if (node.type === "path") return { ...node, painting: drawing({ ...node }, path) };
  return node.paint !== undefined || node.transform !== undefined
    ? { ...node, painting: drawing({ ...node }, path) }
    : { ...node };
}
function schedule(
  nodes: readonly NodeDefinition[],
  output: MeasuredNode[],
  path: string,
  fonts: ResolvedFonts,
  budget: WorkLedger,
  tasks: (() => void)[],
): void {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node)
      tasks.push(() => {
        output.push(measuredNode(node, `${path}/${i}`, fonts, budget, tasks));
      });
  }
}

export function measure(
  document: DocumentDefinition,
  fonts: ResolvedFonts = emptyTextResources,
  budget: WorkLedger = ledger(),
): readonly MeasuredPage[] {
  return document.pages.map((page, i) => {
    const children: MeasuredNode[] = [];
    const tasks: (() => void)[] = [];
    schedule(page.children, children, `/pages/${i}/children`, fonts, budget, tasks);
    while (tasks.length) tasks.pop()?.();
    return { width: page.width, height: page.height, children };
  });
}
