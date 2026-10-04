import { fail, type LayoutOperation, type NormalizedContent, validateDataObject as record } from "@updf/core/internal";
import { dataRecipe } from "./content-data.js";
import { checkRole } from "./content-normalize.js";
import { blockBodyIdentity, blockFooterIdentity, blockHeaderIdentity, deferredPlan } from "./deferred-decoration.js";
import { columnIdentity } from "./row-data.js";

export function blockParts(node: NormalizedContent, operation: LayoutOperation) {
  const parts: BlockParts = { body: [], decorations: [], seen: new Set(), explicitBody: false };
  for (const child of node.children) appendBlockChild(child, parts, operation);
  return { body: parts.body, plan: deferredPlan(parts.decorations) };
}
interface BlockParts {
  body: NormalizedContent[];
  decorations: NormalizedContent[];
  seen: Set<object>;
  explicitBody: boolean;
}
function appendBlockChild(child: NormalizedContent, parts: BlockParts, operation: LayoutOperation): void {
  if (typeof child.value === "string") fail("VDOM_HIERARCHY", child.path, "Text requires Paragraph");
  const identity = child.value.identity;
  if (identity === blockHeaderIdentity || identity === blockFooterIdentity) {
    if (parts.seen.has(identity)) fail("VDOM_HIERARCHY", child.path, "Duplicate Block slot");
    parts.seen.add(identity);
    parts.decorations.push(child);
    return;
  }
  if (identity === blockBodyIdentity) {
    if (parts.seen.has(identity) || parts.body.length || !child.scope)
      fail("VDOM_HIERARCHY", child.path, "Use one Block.Body or direct body children");
    parts.seen.add(identity);
    parts.explicitBody = true;
    record(child.value.props, ["children"], child.path);
    const input = child.value.props.children;
    const normalized = operation.scoped(child.scope, () =>
      operation.normalizeContent(
        input,
        dataRecipe,
        `${child.path}/children`,
        checkRole,
        undefined,
        undefined,
        columnIdentity,
      ),
    );
    for (const item of normalized) parts.body.push(item);
    return;
  }
  if (parts.explicitBody) fail("VDOM_HIERARCHY", child.path, "Cannot mix Block.Body with direct children");
  parts.body.push(child);
}
