// Test-only access preserves renderer regression coverage without a public facade.
import type { RenderOptions } from "@updf/core";
import { createDrawingLayoutOperation } from "@updf/core/internal-drawing";
import type { Extensions } from "../../packages/layout/dist/extension-types.js";
import { layout } from "../../packages/layout/dist/layout.js";
import type { FlowDocumentDefinition, FlowResult } from "../../packages/layout/dist/types.js";
import { textOptions } from "./text-options.js";

export * from "@updf/layout";
export { Flow as LegacyFlow } from "../../packages/layout/dist/transitional-vdom.js";
export { layout, measure } from "./text-options.js";

export function layoutFlow(
  input: FlowDocumentDefinition,
  options: RenderOptions = {},
  extensions?: Extensions,
): FlowResult {
  return layoutFlowUnknown(input, options, extensions);
}
export function layoutFlowUnknown(input: unknown, options: RenderOptions = {}, extensions?: Extensions): FlowResult {
  const operation = createDrawingLayoutOperation(textOptions(options));
  try {
    return layout(input, operation, extensions);
  } finally {
    operation.close();
  }
}
