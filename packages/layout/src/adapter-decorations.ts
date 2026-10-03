import { array, fail, type LayoutOperation, number, validateDataObject as record } from "@updf/core/internal";
import { jsx } from "@updf/core/jsx-runtime";
import { dataRecipe } from "./content-data.js";
import type { DecorationPlan } from "./decoration-types.js";
import { BlockFooter, BlockHeader, deferredPlan } from "./deferred-decoration.js";
import type { ContentDecoration } from "./extension-types.js";

export function reserveContentDecorations(
  entries: readonly ContentDecoration[],
  operation: LayoutOperation,
  path: string,
): DecorationPlan {
  array(entries, operation.policy.nodes, path);
  const nodes = entries.flatMap((entry, index) => {
    const at = `${path}/${index}`;
    record(entry, ["edge", "repeat", "height", "content"], at);
    number(entry.height, `${at}/height`, true);
    if (entry.edge !== "before" && entry.edge !== "after") fail("TYPE", at, "Expected decoration edge");
    if (entry.repeat !== "all" && entry.repeat !== (entry.edge === "before" ? "first" : "last"))
      fail("TYPE", at, "Unsupported edge repetition");
    const component = entry.edge === "before" ? BlockHeader : BlockFooter;
    return operation.normalizeContent(
      jsx(component, { height: entry.height, repeat: entry.repeat === "all", children: entry.content }),
      dataRecipe,
      at,
    );
  });
  const plan = deferredPlan(nodes);
  if (!plan) fail("TYPE", path, "At least one reserved content decoration is required");
  return plan;
}
