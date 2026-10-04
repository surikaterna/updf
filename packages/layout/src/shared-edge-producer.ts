import type { NodeDefinition } from "@updf/core";
import type { LayoutOperation } from "@updf/core/internal";
import type { PaintCall, PlacedFragment, PreparedBlock } from "./protocol.js";
import { resolveFragment, resolvePaint } from "./protocol-runtime.js";
import { sharedEdgeGroupNode } from "./shared-edge-emission.js";

export function coordinateSharedEdges(base: PreparedBlock, operation: LayoutOperation, path: string): PreparedBlock {
  const prepared: PreparedBlock = {
    ...base,
    fragment: (request) => resolveFragment(prepared, request),
    *fragmentSteps(request) {
      const placed = yield { block: base, request };
      if (!placed) return undefined;
      const result: PlacedFragment = {
        ...placed,
        paint: (context: Parameters<typeof placed.paint>[0]) => resolvePaint(result, context),
        *paintSteps(context): Generator<PaintCall, readonly NodeDefinition[], readonly NodeDefinition[]> {
          // Keep the placement outside the report ledger: subtracting a page origin
          // cannot recover the original binary64 local boundary coordinates.
          const nodes = yield {
            fragment: placed,
            context: { ...context, x: 0, y: 0, start: (offset) => offset },
          };
          context.budget.generated(1, 0, 0, 0, path);
          return [
            sharedEdgeGroupNode(nodes, {
              operation,
              path,
              x: context.x,
              y: context.y,
              width: base.naturalSize.width,
              height: placed.height,
            }),
          ];
        },
      };
      return result;
    },
  };
  return prepared;
}
