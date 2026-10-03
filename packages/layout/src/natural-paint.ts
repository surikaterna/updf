import type { NodeDefinition } from "@updf/core";
import { fail, sum } from "@updf/core/internal";
import { OutputBudget } from "./budget.js";
import type { PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";

export function paintNatural(
  prepared: readonly PreparedBlock[],
  width: number,
  policy: ConstructorParameters<typeof OutputBudget>[0],
  path: string,
): NodeDefinition[] {
  const nodes: NodeDefinition[] = [],
    budget = new OutputBudget(policy);
  let y = 0;
  for (const block of prepared) {
    if (block.control) fail("VDOM_HIERARCHY", path, "Page controls have no unpaginated measurement");
    const capacity = Math.max(1, block.naturalSize.height);
    const fragment = resolveFragment(block, {
      offset: 0,
      width,
      usedHeight: 0,
      availableHeight: capacity,
      freshHeight: capacity,
      atFreshRegion: true,
      budget: budget.fork(),
    });
    if (!fragment || fragment.nextOffset !== block.extent)
      fail("LAYOUT_OVERSIZED", path, "Content cannot be measured as one natural fragment");
    for (const node of resolvePaint(fragment, { x: 0, y, budget, start: (offset) => y + offset })) nodes.push(node);
    y = sum([y, fragment.height]);
  }
  return nodes;
}
