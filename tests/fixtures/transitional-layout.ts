// Test-only access preserves renderer regression coverage without a public facade.
import type { RenderOptions } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import type { Extensions } from "../../packages/layout/src/extension-types.js";
import { layout } from "../../packages/layout/src/layout.js";
import type { FlowDocumentDefinition, FlowResult } from "../../packages/layout/src/types.js";

export * from "@updf/layout";
export { Flow as LegacyFlow } from "../../packages/layout/src/transitional-vdom.js";

export function layoutFlow(
  input: FlowDocumentDefinition,
  options: RenderOptions = {},
  extensions?: Extensions,
): FlowResult {
  return layoutFlowUnknown(input, options, extensions);
}
export function layoutFlowUnknown(input: unknown, options: RenderOptions = {}, extensions?: Extensions): FlowResult {
  const operation = createDrawingLayoutOperation(options);
  try {
    return layout(input, operation, extensions);
  } finally {
    operation.close();
  }
}
