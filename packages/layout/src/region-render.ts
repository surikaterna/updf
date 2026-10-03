import type { NodeDefinition } from "@updf/core";
import { fail, type LayoutOperation, type NormalizedContent, type SemanticRecipe } from "@updf/core/internal";
import { compile } from "./block-compiler.js";
import type { OutputBudget } from "./budget.js";
import { dataRecipe } from "./content-data.js";
import { checkRole, convertBlocks } from "./content-normalize.js";
import { finalizeDecorations } from "./deferred-decoration.js";
import { nativeData } from "./document-native.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import { type PageInfo, pageBinding } from "./page-context.js";
import { paginate } from "./paginator.js";
import { regionFailure } from "./region-overflow.js";
import { template } from "./template.js";

const nativeIdentity = Object.freeze({});
export function renderRegion(
  input: unknown,
  width: number,
  height: number,
  path: string,
  operation: LayoutOperation,
  info: PageInfo,
  outputBudget: OutputBudget,
  extensions?: Extensions,
  lifetime: ExtensionLifetime = { active: true },
): readonly NodeDefinition[] {
  if (nativeData(input)) return input;
  const nodes = operation.normalizeContent(input, dataRecipe, path, regionRole, (node) => ({
    identity: nativeIdentity,
    props: { descriptor: node },
    opaque: true,
  }));
  const drawings = nodes.filter((node) => typeof node.value !== "string" && node.value.identity === nativeIdentity);
  if (drawings.length) return renderDrawings(drawings, nodes.length, width, height, path, operation, info);
  const geometry = template({ width, height, margins: { top: 0, right: 0, bottom: 0, left: 0 } }, operation);
  const prepared = compile(convertBlocks(nodes, operation), width, path, {
    operation,
    lifetime,
    freshHeight: geometry.body.height,
    ...(extensions ? { extensions } : {}),
  });
  const budget = outputBudget.fork();
  let pages = 0;
  try {
    const result = paginate(geometry, prepared, operation.policy, {
      budget,
      reservePage() {
        if (++pages > 1)
          fail(
            "VERTICAL_OVERFLOW",
            path,
            "Final decoration exceeds its reserved height; body pagination is not retried",
          );
      },
    });
    return finalizeDecorations(result.document.pages[0]?.children ?? [], info, operation, budget);
  } catch (error) {
    regionFailure(error, path);
  }
}
function renderDrawings(
  drawings: readonly NormalizedContent[],
  count: number,
  width: number,
  height: number,
  path: string,
  operation: LayoutOperation,
  info: PageInfo,
): readonly NodeDefinition[] {
  if (drawings.length !== count)
    fail("VDOM_HIERARCHY", path, "Do not mix positioned drawings and stacked blocks in a reserved region");
  const result: NodeDefinition[] = [];
  for (const node of drawings) {
    if (!node.scope || typeof node.value === "string") fail("TYPE", path, "Expected owned drawing recipe");
    const descriptor = node.value.props.descriptor;
    const rendered = operation.scoped(node.scope, () =>
      operation.finalContext(pageBinding, info, () => operation.lowerDrawing(descriptor, width, height, node.path)),
    );
    for (const child of rendered) result.push(child);
  }
  return result;
}
function regionRole(value: string | SemanticRecipe, path: string, parent: object | undefined): void {
  if (typeof value !== "string" && value.identity === nativeIdentity) {
    if (parent) fail("VDOM_HIERARCHY", path, "Positioned drawing cannot be inline or stacked content");
    return;
  }
  checkRole(value, path, parent);
}
