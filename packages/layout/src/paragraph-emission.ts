import type { NodeDefinition } from "@updf/core";
import type { InlineLine } from "@updf/core/internal";
import { codePoints, fail } from "@updf/core/internal";
import type { BudgetTotals, OutputBudget } from "./budget.js";
import type { PreparedVisual } from "./inline-adapters.js";

/** Counts exactly the prepared paint tree, without constructing trial native text. */
export function paragraphEmission(line: InlineLine, visuals: ReadonlyMap<number, PreparedVisual>): BudgetTotals {
  let nodes = 1,
    text = 0,
    commands = 0;
  for (const fragment of line.line.fragments) {
    const visual = visuals.get(fragment.runIndex);
    if (!visual) {
      nodes++;
      text += codePoints(fragment.text);
      continue;
    }
    if (!visual.measurement.nodes.length) continue;
    nodes += 1 + visual.emissionCounts.nodes;
    text += visual.emissionCounts.text;
    commands += visual.emissionCounts.commands;
  }
  return Object.freeze({ nodes, text, commands, work: 0 });
}
export function chargeParagraphEmission(
  nodes: readonly NodeDefinition[],
  expected: BudgetTotals,
  budget: OutputBudget,
  path: string,
): void {
  const before = budget.totals();
  budget.charge(nodes, path);
  const after = budget.totals();
  for (const field of ["nodes", "text", "commands"] as const)
    if (after[field] - before[field] !== expected[field])
      fail("TYPE", path, "Prepared paragraph emission count mismatch");
}
