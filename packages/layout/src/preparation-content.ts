import { contentChildren, fail, type LayoutOperation, type NormalizedContent } from "@updf/core/internal";
import type { createPreparingDrawingOperation } from "@updf/core/internal-preparation";
import { checkBlockChildRole, checkRole } from "./content-role.js";
import { dataRecipe } from "./content-data.js";
import { bodyIdentity, documentIdentity, flowIdentity, sectionRecipe } from "./document-data.js";
import { normalizeFlowChildren, scoped, sectionGuard } from "./mixed-layout.js";
import { columnIdentity } from "./row-data.js";
import { blockBodyIdentity } from "./deferred-decoration.js";

type Controls = ReturnType<typeof createPreparingDrawingOperation>["controls"];

/** Declarations stay with layout roles; normalization and expansion remain core-owned. */
export function captureDocument(
  content: unknown,
  operation: LayoutOperation,
  controls: Controls,
  visit: (node: NormalizedContent) => void,
  bodyFor?: (node: NormalizedContent) => { readonly body: unknown } | undefined,
): NormalizedContent {
  const roots = operation.normalizeContent(content, sectionRecipe, "/document");
  const root = roots[0];
  if (roots.length !== 1 || !root || typeof root.value === "string" || root.value.identity !== documentIdentity)
    fail("VDOM_HIERARCHY", "/document", "Expected exactly one layout Document");
  const pending = [root];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node.value === "string") continue;
    visit(node);
    const children = scoped(node, operation, () => declaredChildren(node, operation, bodyFor?.(node)));
    if (children) controls.capture(node, children);
    const values = children ?? node.children;
    for (let i = values.length - 1; i >= 0; i--) {
      const child = values[i];
      if (child) pending.push(child);
    }
  }
  return root;
}

function declaredChildren(node: NormalizedContent, operation: LayoutOperation, content?: { readonly body: unknown }) {
  if (typeof node.value === "string") return undefined;
  const identity = node.value.identity;
  if (identity === documentIdentity)
    return operation.normalizeContent(contentChildren(node), sectionRecipe, "/document/children", sectionGuard);
  if (identity === flowIdentity) return normalizeFlowChildren(node, operation).children;
  if (content || identity === bodyIdentity || identity === blockBodyIdentity || identity === columnIdentity)
    return operation.normalizeContent(
      content ? content.body : contentChildren(node),
      dataRecipe,
      `${node.path}/children`,
      content ? checkBlockChildRole : checkRole,
      undefined,
      undefined,
      columnIdentity,
    );
  return undefined;
}
