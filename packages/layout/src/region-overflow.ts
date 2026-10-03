import type { NodeDefinition } from "@updf/core";
import { DocumentError, type LayoutOperation } from "@updf/core/internal";

export function regionFailure(error: unknown, path: string): never {
  if (!(error instanceof DocumentError)) throw error;
  const diagnostic = error.diagnostics[0];
  if (!diagnostic || (diagnostic.code !== "LAYOUT_OVERSIZED" && diagnostic.code !== "BOUNDS")) throw error;
  throw new DocumentError(
    "VERTICAL_OVERFLOW",
    diagnostic.path || path,
    "Final decoration exceeds its reserved width/height; body pagination is not retried",
    diagnostic,
  );
}
export function validateRegion(
  nodes: readonly NodeDefinition[],
  width: number,
  height: number,
  path: string,
  operation: LayoutOperation,
): void {
  try {
    operation.validateFixed(nodes, width, height, path);
  } catch (error) {
    regionFailure(error, path);
  }
}
