import {
  array,
  checkLimit,
  isContentData,
  isVNode,
  type LayoutOperation,
  validateDataObject as record,
  snapshotData,
} from "@updf/core/internal";
import { blocks } from "./blocks.js";
import { OutputBudget } from "./budget.js";
import { normalizeBlocks } from "./content-normalize.js";
import { preflight } from "./data.js";
import { finalizeDecorations } from "./deferred-decoration.js";
import type { ExtensionLifetime } from "./extension-producer.js";
import type { Extensions } from "./extension-types.js";
import { validateExtensions } from "./extensions.js";
import { paginate } from "./paginator.js";
import { template } from "./template.js";
import type { FlowDocumentDefinition, FlowResult } from "./types.js";

export function layout(
  input: unknown,
  operation: LayoutOperation,
  extensions?: Extensions,
  lifetime: ExtensionLifetime = { active: true },
): FlowResult {
  validateExtensions(extensions);
  preflight(input, operation.policy);
  record(input, ["pageTemplate", "body"], "");
  array(input.body, operation.policy.nodes, "/body");
  if (hasContent(input.body)) input = { ...input, body: normalizeBlocks(input.body, operation, "/body") };
  record(input, ["pageTemplate", "body"], "");
  array(input.body, operation.policy.nodes, "/body");
  let explicitPages = 1;
  input.body.forEach((item, index) => {
    record(
      item,
      ["type", "paragraph", "keepTogether", "height", "children", "props", "style", "decorations"],
      `/body/${index}`,
    );
    if (item.type === "pageBreak") checkLimit(++explicitPages, operation.policy.pages, `/body/${index}`, "Pages");
  });
  const geometry = template(input.pageTemplate, operation);
  const prepared = blocks(
    input as unknown as FlowDocumentDefinition,
    geometry.body.width,
    operation,
    extensions,
    lifetime,
    geometry.body.height,
  );
  const budget = new OutputBudget(operation.policy);
  const result = paginate(geometry, prepared, operation.policy, { budget, reservePage: () => {} });
  return finalized(result, operation, budget);
}
function finalized(result: FlowResult, operation: LayoutOperation, budget: OutputBudget): FlowResult {
  const document = {
    ...result.document,
    pages: result.document.pages.map((page, index) => ({
      ...page,
      children: finalizeDecorations(
        page.children,
        {
          docPageNumber: index + 1,
          docPageCount: result.pageCount,
          sectionNumber: 1,
          flow: { index: 0, pageNumber: index + 1, pageCount: result.pageCount },
        },
        operation,
        budget,
      ),
    })),
  };
  operation.validateDocument(document);
  return snapshotData({ ...result, document }, "/result");
}
function hasContent(input: readonly unknown[]): boolean {
  const tasks = [...input],
    seen = new Set<object>();
  while (tasks.length) {
    const value = tasks.pop();
    if (isVNode(value)) return true;
    if (isContentData(value) && Object.getOwnPropertyDescriptor(value, "type")?.value === "contentParagraph")
      return true;
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    const children = Object.getOwnPropertyDescriptor(value, "children")?.value;
    if (Array.isArray(children)) for (const child of children) tasks.push(child);
  }
  return false;
}
