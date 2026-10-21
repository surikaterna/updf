import type { NodeDefinition } from "@updf/core";
import { fail, MetricSum, number, sum } from "@updf/core/internal";
import { OutputBudget } from "./budget.js";
import { prepareFragmentPaint } from "./fragment-paint-preparation.js";
import type { PlacedFragment, PreparedBlock, PreparedFragmentPaint } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";

export function prepareNatural(
  prepared: readonly PreparedBlock[],
  width: number,
  policy: ConstructorParameters<typeof OutputBudget>[0],
  path: string,
): { readonly height: number; readonly roots: readonly PreparedFragmentPaint[] } {
  const selected = selectNatural(prepared, width, new OutputBudget(policy), path);
  const budget = new OutputBudget(policy);
  const roots: PreparedFragmentPaint[] = [];
  let y = 0;
  for (const fragment of selected.fragments) {
    const preparedPaint = prepareFragmentPaint(fragment, { x: 0, y }, budget, path);
    budget.reserveWork(preparedPaint.work, path);
    roots.push(preparedPaint.root);
    y = sum([y, fragment.height]);
  }
  return { height: selected.height, roots };
}

function selectNatural(prepared: readonly PreparedBlock[], width: number, budget: OutputBudget, path: string) {
  const fragments: PlacedFragment[] = [];
  const height = new MetricSum();
  for (const block of prepared) {
    if (block.control) fail("VDOM_HIERARCHY", path, "Page controls have no unpaginated measurement");
    const fragment = resolveFragment(block, {
      mode: "complete",
      offset: 0,
      width,
      budget,
    });
    if (!fragment || fragment.nextOffset !== block.extent || fragment.advance)
      fail("LAYOUT_OVERSIZED", path, "Content cannot be measured as one natural fragment");
    height.add(number(fragment.height, path));
    fragments.push(fragment);
  }
  return { height: number(height.value, path), fragments };
}

export function paintNatural(
  roots: readonly PreparedFragmentPaint[],
  report?: (prepared: PreparedFragmentPaint) => void,
): NodeDefinition[] {
  const nodes: NodeDefinition[] = [];
  for (const root of roots) {
    report?.(root);
    for (const node of resolvePaint(root)) nodes.push(node);
  }
  return nodes;
}
